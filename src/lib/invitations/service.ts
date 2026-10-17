import "server-only";

import { cacheTag } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { invitationsTag } from "@/lib/invitations/tags";
import { BUSINESS_SEATS, MAX_MEMBERSHIPS, PLAN_LIMITS } from "@/lib/plans/limits";
import { subscriptionIsLive } from "@/lib/plans/plan";
import { userTag } from "@/lib/users/tags";
import { organizationTier } from "@/server/plans";
import { prisma } from "@/server/prisma";

// In-app invitations into an organization (docs/subscriptions.md, section 6). Only existing
// accounts; email invites come later. Every limit is checked inside one transaction that locks the
// parent row first, so two requests at once cannot both take the last slot.

export const INVITATION_TTL_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export type InvitationErrorCode =
  | "FORBIDDEN"
  | "BUSINESS_REQUIRED"
  | "OWNER_HAS_NO_ORGANIZATION"
  | "SEAT_LIMIT"
  | "ALREADY_SUBSCRIBED"
  | "INDIVIDUAL_CANCEL_REQUIRED"
  | "PRO_REQUIRED"
  | "USER_NOT_FOUND"
  | "ALREADY_MEMBER"
  | "ALREADY_INVITED"
  | "INVITE_LIMIT"
  | "MEMBERSHIP_LIMIT"
  | "INVITE_NOT_FOUND"
  | "INVITE_EXPIRED";

export class InvitationServiceError extends Error {
  constructor(readonly code: InvitationErrorCode) {
    super(code);
  }
}

export interface InvitationScope {
  organizationId: string;
  // The signed-in user, who sends or revokes
  userId: string;
}

// Plain data for the client: pending invitations of an organization (/users) or of a user
// (/invitations, /welcome)
export interface InvitationRow {
  id: string;
  organizationId: string;
  organizationName: string;
  invitedByName: string | null;
  inviteeName: string | null;
  inviteeEmail: string | null;
  createdAt: string;
  expiresAt: string;
  // A Business plan invite: a seat in the owner's plan plus the organization
  isPlanInvite: boolean;
}

const ROW_SELECT = {
  id: true,
  organizationId: true,
  subscriptionId: true,
  createdAt: true,
  expiresAt: true,
  organization: { select: { name: true } },
  invitedBy: { select: { name: true } },
  user: { select: { name: true, email: true } },
} satisfies Prisma.InvitationSelect;

function toRow(row: Prisma.InvitationGetPayload<{ select: typeof ROW_SELECT }>): InvitationRow {
  return {
    id: row.id,
    organizationId: row.organizationId,
    organizationName: row.organization.name,
    invitedByName: row.invitedBy.name,
    inviteeName: row.user?.name ?? null,
    inviteeEmail: row.user?.email ?? null,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    isPlanInvite: row.subscriptionId !== null,
  };
}

// Pending and not expired: the ones that still take a slot and can be answered
function pendingWhere(now: Date) {
  return { status: "PENDING", expiresAt: { gt: now } } satisfies Prisma.InvitationWhereInput;
}

async function lockRow(tx: Prisma.TransactionClient, table: "Organization" | "User", id: string) {
  if (table === "Organization") await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${id} FOR UPDATE`;
  else await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${id} FOR UPDATE`;
}

// Moves a pending invitation to its answer. Only while it is still PENDING: an accept and a revoke
// racing each other never both win (the second finds nothing and gets INVITE_NOT_FOUND)
async function respond(
  tx: Prisma.TransactionClient | typeof prisma,
  id: string,
  status: "ACCEPTED" | "DECLINED" | "REVOKED",
  now: Date,
) {
  const { count } = await tx.invitation.updateMany({ where: { id, status: "PENDING" }, data: { status, respondedAt: now } });
  if (count === 0) throw new InvitationServiceError("INVITE_NOT_FOUND");
}

// Members besides the owner (deactivated ones too: they keep their slot) plus pending invitations
async function usedSlots(tx: Prisma.TransactionClient, organizationId: string, ownerId: string, now: Date) {
  const [members, pending] = await Promise.all([
    tx.membership.count({ where: { organizationId, userId: { not: ownerId } } }),
    tx.invitation.count({ where: { organizationId, ...pendingWhere(now) } }),
  ]);
  return members + pending;
}

// Owner or admin, active in this organization
async function assertCanInvite(tx: Prisma.TransactionClient, scope: InvitationScope) {
  const membership = await tx.membership.findUnique({
    where: { userId_organizationId: { userId: scope.userId, organizationId: scope.organizationId } },
    select: { role: true, isActive: true },
  });
  if (!membership?.isActive || membership.role === "MEMBER") throw new InvitationServiceError("FORBIDDEN");
}

// The checks every invitation into an organization shares: an active account that is not a member,
// not invited yet, a free place (owner + 3, pending invitations included) and room for one more
// membership. The organization row is already locked by the caller
async function checkInvitee(tx: Prisma.TransactionClient, organizationId: string, inviterId: string, email: string, now: Date) {
  const invitee = await tx.user.findFirst({
    where: { email: email.toLowerCase(), deletedAt: null, isActive: true },
    select: { id: true, _count: { select: { memberships: true } } },
  });
  if (!invitee) throw new InvitationServiceError("USER_NOT_FOUND");

  const member = await tx.membership.count({ where: { organizationId, userId: invitee.id } });
  if (member > 0 || invitee.id === inviterId) throw new InvitationServiceError("ALREADY_MEMBER");

  const invited = await tx.invitation.count({ where: { organizationId, userId: invitee.id, ...pendingWhere(now) } });
  if (invited > 0) throw new InvitationServiceError("ALREADY_INVITED");

  const organization = await tx.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { ownerId: true } });
  if ((await usedSlots(tx, organizationId, organization.ownerId, now)) >= PLAN_LIMITS.PRO.invites) {
    throw new InvitationServiceError("INVITE_LIMIT");
  }
  // Early feedback only; accepting checks it again
  if (invitee._count.memberships >= MAX_MEMBERSHIPS) throw new InvitationServiceError("MEMBERSHIP_LIMIT");
  return invitee;
}

// Already in a Business plan, as a member (a seat) or as the owner of one, live or expired
async function assertNotInBusinessPlan(tx: Prisma.TransactionClient, userId: string) {
  const [seat, ownBusiness] = await Promise.all([
    tx.subscriptionSeat.count({ where: { userId } }),
    tx.subscription.count({ where: { userId, planType: "BUSINESS" } }),
  ]);
  if (seat > 0 || ownBusiness > 0) throw new InvitationServiceError("ALREADY_SUBSCRIBED");
}

function expiresAt(now: Date): Date {
  return new Date(now.getTime() + INVITATION_TTL_DAYS * DAY_MS);
}

// Returns the invitee's id, so the caller can expire their cached account
export async function createInvitation(scope: InvitationScope, email: string): Promise<{ inviteeId: string }> {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    await lockRow(tx, "Organization", scope.organizationId);
    await assertCanInvite(tx, scope);

    if ((await organizationTier(tx, scope.organizationId, now)) !== "PRO") throw new InvitationServiceError("PRO_REQUIRED");

    const invitee = await checkInvitee(tx, scope.organizationId, scope.userId, email, now);
    await tx.invitation.create({
      data: { organizationId: scope.organizationId, invitedById: scope.userId, userId: invitee.id, expiresAt: expiresAt(now) },
    });
    return { inviteeId: invitee.id };
  });
}

// The Business owner invites someone into the plan (docs/subscriptions.md, section 6.2): a seat plus
// a membership in the owner's organization, so it also takes one of its 3 places. The subscription
// row is locked first (its seats), then the organization (its places)
export async function createPlanInvitation(
  ownerId: string,
  email: string,
): Promise<{ inviteeId: string; organizationId: string; subscriptionId: string }> {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const subscription = await tx.subscription.findUnique({
      where: { userId: ownerId },
      select: { id: true, planType: true, status: true, currentPeriodEnd: true },
    });
    if (!subscription || subscription.planType !== "BUSINESS") throw new InvitationServiceError("BUSINESS_REQUIRED");
    await tx.$queryRaw`SELECT id FROM "Subscription" WHERE id = ${subscription.id} FOR UPDATE`;
    if (!subscriptionIsLive(subscription, now)) throw new InvitationServiceError("PRO_REQUIRED");

    const organization = await tx.organization.findUnique({ where: { ownerId }, select: { id: true } });
    if (!organization) throw new InvitationServiceError("OWNER_HAS_NO_ORGANIZATION");
    await lockRow(tx, "Organization", organization.id);

    const invitee = await checkInvitee(tx, organization.id, ownerId, email, now);
    await assertNotInBusinessPlan(tx, invitee.id);

    const [seats, pendingSeats] = await Promise.all([
      tx.subscriptionSeat.count({ where: { subscriptionId: subscription.id } }),
      tx.invitation.count({ where: { subscriptionId: subscription.id, ...pendingWhere(now) } }),
    ]);
    if (seats + pendingSeats >= BUSINESS_SEATS) throw new InvitationServiceError("SEAT_LIMIT");

    await tx.invitation.create({
      data: {
        organizationId: organization.id,
        invitedById: ownerId,
        userId: invitee.id,
        subscriptionId: subscription.id,
        expiresAt: expiresAt(now),
      },
    });
    return { inviteeId: invitee.id, organizationId: organization.id, subscriptionId: subscription.id };
  });
}

// Owner or admin; only a pending invitation. Returns the invitee's id
export async function revokeInvitation(
  scope: InvitationScope,
  id: string,
): Promise<{ inviteeId: string | null; subscriptionId: string | null }> {
  return prisma.$transaction(async (tx) => {
    await assertCanInvite(tx, scope);
    const invitation = await tx.invitation.findFirst({
      where: { id, organizationId: scope.organizationId, status: "PENDING" },
      select: { userId: true, subscriptionId: true },
    });
    if (!invitation) throw new InvitationServiceError("INVITE_NOT_FOUND");
    await respond(tx, id, "REVOKED", new Date());
    return { inviteeId: invitation.userId, subscriptionId: invitation.subscriptionId };
  });
}

// The Business owner revokes a pending plan invite from Settings → Plan (whatever organization they
// are working in)
export async function revokePlanInvitation(
  ownerId: string,
  id: string,
): Promise<{ inviteeId: string | null; organizationId: string; subscriptionId: string }> {
  const invitation = await prisma.invitation.findFirst({
    where: { id, status: "PENDING", subscription: { userId: ownerId } },
    select: { userId: true, organizationId: true, subscriptionId: true },
  });
  if (!invitation?.subscriptionId) throw new InvitationServiceError("INVITE_NOT_FOUND");
  // Accepted meanwhile → INVITE_NOT_FOUND, never REVOKED over a seat that already exists
  await respond(prisma, id, "REVOKED", new Date());
  return { inviteeId: invitation.userId, organizationId: invitation.organizationId, subscriptionId: invitation.subscriptionId };
}

// The invitee's own pending invitation, or the reason it can no longer be answered
async function findAnswerable(tx: Prisma.TransactionClient | typeof prisma, userId: string, id: string, now: Date) {
  const invitation = await tx.invitation.findFirst({
    where: { id, userId, status: "PENDING" },
    select: { organizationId: true, expiresAt: true, subscriptionId: true },
  });
  if (!invitation) throw new InvitationServiceError("INVITE_NOT_FOUND");
  if (invitation.expiresAt <= now) throw new InvitationServiceError("INVITE_EXPIRED");
  return invitation;
}

// What accepting a plan invite does to the user's own Individual plan, so the client can warn first
export interface InvitationPreview {
  isPlanInvite: boolean;
  // The Individual plan that accepting cancels, or null
  individual: { billingInterval: "MONTHLY" | "YEARLY"; currentPeriodEnd: string; expired: boolean } | null;
}

export async function getInvitationPreview(userId: string, id: string): Promise<InvitationPreview> {
  const now = new Date();
  const invitation = await findAnswerable(prisma, userId, id, now);
  if (!invitation.subscriptionId) return { isPlanInvite: false, individual: null };
  const own = await prisma.subscription.findUnique({
    where: { userId },
    select: { planType: true, billingInterval: true, status: true, currentPeriodEnd: true },
  });
  return {
    isPlanInvite: true,
    individual:
      own?.planType === "INDIVIDUAL"
        ? {
            billingInterval: own.billingInterval,
            currentPeriodEnd: own.currentPeriodEnd.toISOString(),
            expired: !subscriptionIsLive(own, now),
          }
        : null,
  };
}

// Joins the organization as a MEMBER; a plan invite also takes a seat in the owner's Business plan
// and cancels the user's own Individual plan (auto-renew off, Pro until its period ends), which the
// user must confirm (cancelIndividual). Returns the organization, so the caller makes it the active
// one, and the plan's subscription for its caches
export async function acceptInvitation(
  userId: string,
  id: string,
  { cancelIndividual = false }: { cancelIndividual?: boolean } = {},
): Promise<{ organizationId: string; subscriptionId: string | null }> {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    // The user first (their membership count), then the plan (its seats), then the organization (its
    // slots): the plan before the organization, like createPlanInvitation, so the two never deadlock
    await lockRow(tx, "User", userId);
    const { organizationId, subscriptionId } = await findAnswerable(tx, userId, id, now);
    if (subscriptionId) await tx.$queryRaw`SELECT id FROM "Subscription" WHERE id = ${subscriptionId} FOR UPDATE`;
    await lockRow(tx, "Organization", organizationId);

    // The owner's plan may have expired since the invitation was sent
    if ((await organizationTier(tx, organizationId, now)) !== "PRO") throw new InvitationServiceError("PRO_REQUIRED");

    const memberships = await tx.membership.count({ where: { userId } });
    if (memberships >= MAX_MEMBERSHIPS) throw new InvitationServiceError("MEMBERSHIP_LIMIT");
    if (await tx.membership.count({ where: { userId, organizationId } })) throw new InvitationServiceError("ALREADY_MEMBER");

    let individualId: string | null = null;
    if (subscriptionId) {
      await assertNotInBusinessPlan(tx, userId);
      const own = await tx.subscription.findUnique({ where: { userId }, select: { id: true, planType: true } });
      if (own?.planType === "INDIVIDUAL") {
        if (!cancelIndividual) throw new InvitationServiceError("INDIVIDUAL_CANCEL_REQUIRED");
        individualId = own.id;
      }
    }

    // The pending invitation already holds its place and its seat, so the limits are not counted again
    await tx.membership.create({ data: { userId, organizationId, role: "MEMBER" } });
    if (subscriptionId) {
      await tx.subscriptionSeat.create({ data: { subscriptionId, userId } });
      if (individualId) {
        await tx.subscription.update({ where: { id: individualId }, data: { status: "CANCELED", canceledAt: now } });
      }
    }
    // Revoked meanwhile: everything above rolls back
    await respond(tx, id, "ACCEPTED", now);
    return { organizationId, subscriptionId };
  });
}

export async function declineInvitation(
  userId: string,
  id: string,
): Promise<{ organizationId: string; subscriptionId: string | null }> {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const { organizationId, subscriptionId } = await findAnswerable(tx, userId, id, now);
    await respond(tx, id, "DECLINED", now);
    return { organizationId, subscriptionId };
  });
}

// ---------------------------------------------------------------------------
// Reads. Cached rows; whether a pending one expired is decided with the request's time
// ---------------------------------------------------------------------------

async function loadOrganizationInvitations(organizationId: string): Promise<InvitationRow[]> {
  "use cache";
  cacheTag(invitationsTag(organizationId));
  const rows = await prisma.invitation.findMany({
    where: { organizationId, status: "PENDING" },
    select: ROW_SELECT,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toRow);
}

async function loadUserInvitations(userId: string): Promise<InvitationRow[]> {
  "use cache";
  cacheTag(userTag(userId));
  const rows = await prisma.invitation.findMany({
    where: { userId, status: "PENDING" },
    select: ROW_SELECT,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toRow);
}

function stillPending(rows: InvitationRow[]): InvitationRow[] {
  const now = Date.now();
  return rows.filter((row) => Date.parse(row.expiresAt) > now);
}

// An organization's pending invitations (/users)
export async function listOrganizationInvitations(organizationId: string): Promise<InvitationRow[]> {
  return stillPending(await loadOrganizationInvitations(organizationId));
}

// The signed-in user's pending invitations (/invitations, /welcome, the sidebar count)
export async function listUserInvitations(userId: string): Promise<InvitationRow[]> {
  return stillPending(await loadUserInvitations(userId));
}
