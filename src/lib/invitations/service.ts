import "server-only";

import { cacheTag } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { invitationsTag } from "@/lib/invitations/tags";
import { MAX_MEMBERSHIPS, PLAN_LIMITS } from "@/lib/plans/limits";
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
}

const ROW_SELECT = {
  id: true,
  organizationId: true,
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

// Returns the invitee's id, so the caller can expire their cached account
export async function createInvitation(scope: InvitationScope, email: string): Promise<{ inviteeId: string }> {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    await lockRow(tx, "Organization", scope.organizationId);
    await assertCanInvite(tx, scope);

    if ((await organizationTier(tx, scope.organizationId, now)) !== "PRO") throw new InvitationServiceError("PRO_REQUIRED");

    const invitee = await tx.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null, isActive: true },
      select: { id: true, _count: { select: { memberships: true } } },
    });
    if (!invitee) throw new InvitationServiceError("USER_NOT_FOUND");

    const member = await tx.membership.count({ where: { organizationId: scope.organizationId, userId: invitee.id } });
    if (member > 0 || invitee.id === scope.userId) throw new InvitationServiceError("ALREADY_MEMBER");

    const invited = await tx.invitation.count({
      where: { organizationId: scope.organizationId, userId: invitee.id, ...pendingWhere(now) },
    });
    if (invited > 0) throw new InvitationServiceError("ALREADY_INVITED");

    const organization = await tx.organization.findUniqueOrThrow({ where: { id: scope.organizationId }, select: { ownerId: true } });
    if ((await usedSlots(tx, scope.organizationId, organization.ownerId, now)) >= PLAN_LIMITS.PRO.invites) {
      throw new InvitationServiceError("INVITE_LIMIT");
    }
    // Early feedback only; accepting checks it again
    if (invitee._count.memberships >= MAX_MEMBERSHIPS) throw new InvitationServiceError("MEMBERSHIP_LIMIT");

    await tx.invitation.create({
      data: {
        organizationId: scope.organizationId,
        invitedById: scope.userId,
        userId: invitee.id,
        expiresAt: new Date(now.getTime() + INVITATION_TTL_DAYS * DAY_MS),
      },
    });
    return { inviteeId: invitee.id };
  });
}

// Owner or admin; only a pending invitation. Returns the invitee's id
export async function revokeInvitation(scope: InvitationScope, id: string): Promise<{ inviteeId: string | null }> {
  return prisma.$transaction(async (tx) => {
    await assertCanInvite(tx, scope);
    const invitation = await tx.invitation.findFirst({
      where: { id, organizationId: scope.organizationId, status: "PENDING" },
      select: { userId: true },
    });
    if (!invitation) throw new InvitationServiceError("INVITE_NOT_FOUND");
    await tx.invitation.update({ where: { id }, data: { status: "REVOKED", respondedAt: new Date() } });
    return { inviteeId: invitation.userId };
  });
}

// The invitee's own pending invitation, or the reason it can no longer be answered
async function findAnswerable(tx: Prisma.TransactionClient, userId: string, id: string, now: Date) {
  const invitation = await tx.invitation.findFirst({
    where: { id, userId, status: "PENDING" },
    select: { organizationId: true, expiresAt: true },
  });
  if (!invitation) throw new InvitationServiceError("INVITE_NOT_FOUND");
  if (invitation.expiresAt <= now) throw new InvitationServiceError("INVITE_EXPIRED");
  return invitation;
}

// Joins the organization as a MEMBER. Returns it, so the caller makes it the active one
export async function acceptInvitation(userId: string, id: string): Promise<{ organizationId: string }> {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    // The user first (their membership count), then the organization (its slots)
    await lockRow(tx, "User", userId);
    const { organizationId } = await findAnswerable(tx, userId, id, now);
    await lockRow(tx, "Organization", organizationId);

    // The owner's plan may have expired since the invitation was sent
    if ((await organizationTier(tx, organizationId, now)) !== "PRO") throw new InvitationServiceError("PRO_REQUIRED");

    const memberships = await tx.membership.count({ where: { userId } });
    if (memberships >= MAX_MEMBERSHIPS) throw new InvitationServiceError("MEMBERSHIP_LIMIT");
    if (await tx.membership.count({ where: { userId, organizationId } })) throw new InvitationServiceError("ALREADY_MEMBER");

    // The pending invitation already holds its slot, so the limit is not counted again
    await tx.membership.create({ data: { userId, organizationId, role: "MEMBER" } });
    await tx.invitation.update({ where: { id }, data: { status: "ACCEPTED", respondedAt: now } });
    return { organizationId };
  });
}

export async function declineInvitation(userId: string, id: string): Promise<{ organizationId: string }> {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const { organizationId } = await findAnswerable(tx, userId, id, now);
    await tx.invitation.update({ where: { id }, data: { status: "DECLINED", respondedAt: now } });
    return { organizationId };
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
