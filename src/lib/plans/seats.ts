import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { subscriptionTag } from "@/lib/plans/tags";
import { userTag } from "@/lib/users/tags";
import { prisma } from "@/server/prisma";

// The Business plan's members (docs/subscriptions.md, sections 8.1 and 8.2). A seat always comes
// with a membership in the owner's organization: removing either ends the other, in one transaction.

export type SeatErrorCode = "BUSINESS_REQUIRED" | "NOT_FOUND";

export class SeatServiceError extends Error {
  constructor(readonly code: SeatErrorCode) {
    super(code);
  }
}

export interface PlanMemberRow {
  userId: string;
  name: string | null;
  email: string | null;
  image: string | null;
  joinedAt: string;
}

export interface PlanInvitationRow {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface PlanMembers {
  subscriptionId: string;
  members: PlanMemberRow[];
  pending: PlanInvitationRow[];
}

// The seats and pending plan invites of a Business owner's plan (Settings → Plan). Cached with the
// subscription's tag, which every seat and plan invite change expires; expired invitations are
// dropped with the request's time
export async function listPlanMembers(ownerId: string): Promise<PlanMembers | null> {
  const loaded = await loadPlanMembers(ownerId);
  if (!loaded) return null;
  const now = Date.now();
  return { ...loaded, pending: loaded.pending.filter((invitation) => Date.parse(invitation.expiresAt) > now) };
}

// Tagged with the owner too (a plan created or removed), and short-lived like the plan rows: plans
// also change outside the app (scripts/data/set-plan.ts)
async function loadPlanMembers(ownerId: string): Promise<PlanMembers | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(userTag(ownerId));
  const subscription = await prisma.subscription.findUnique({
    where: { userId: ownerId },
    select: {
      id: true,
      planType: true,
      seats: {
        select: { createdAt: true, user: { select: { id: true, name: true, email: true, image: true } } },
        orderBy: { createdAt: "asc" },
      },
      invitations: {
        where: { status: "PENDING" },
        select: { id: true, createdAt: true, expiresAt: true, user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!subscription || subscription.planType !== "BUSINESS") return null;
  cacheTag(subscriptionTag(subscription.id));

  return {
    subscriptionId: subscription.id,
    members: subscription.seats.map(({ createdAt, user }) => ({
      userId: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      joinedAt: createdAt.toISOString(),
    })),
    pending: subscription.invitations.map((invitation) => ({
      id: invitation.id,
      name: invitation.user?.name ?? null,
      email: invitation.user?.email ?? null,
      createdAt: invitation.createdAt.toISOString(),
      expiresAt: invitation.expiresAt.toISOString(),
    })),
  };
}

// Ends the seats of these users that belong to the Business plan of the organization's owner. Called
// inside the transaction that removes their memberships (removed from /users, or leaving), so a seat
// never outlives its membership. Returns the subscription, for its caches
export async function endSeatsInOrganization(
  tx: Prisma.TransactionClient,
  organizationId: string,
  userIds: string[],
): Promise<string | null> {
  const seats = await tx.subscriptionSeat.findMany({
    where: { userId: { in: userIds }, subscription: { user: { ownedOrganization: { id: organizationId } } } },
    select: { id: true, subscriptionId: true },
  });
  if (seats.length === 0) return null;
  await tx.subscriptionSeat.deleteMany({ where: { id: { in: seats.map((seat) => seat.id) } } });
  return seats[0].subscriptionId;
}

// The Business owner removes a member from the plan: the seat and the membership in the owner's
// organization go together; their surveys stay. Allowed while the plan is expired
export async function removeSeat(
  ownerId: string,
  memberUserId: string,
): Promise<{ subscriptionId: string; organizationId: string | null; inviteeIds: string[] }> {
  return prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.findUnique({ where: { userId: ownerId }, select: { id: true, planType: true } });
    if (!subscription || subscription.planType !== "BUSINESS") throw new SeatServiceError("BUSINESS_REQUIRED");
    await tx.$queryRaw`SELECT id FROM "Subscription" WHERE id = ${subscription.id} FOR UPDATE`;

    const { count } = await tx.subscriptionSeat.deleteMany({ where: { subscriptionId: subscription.id, userId: memberUserId } });
    if (count === 0) throw new SeatServiceError("NOT_FOUND");

    const organization = await tx.organization.findUnique({ where: { ownerId }, select: { id: true } });
    if (!organization) return { subscriptionId: subscription.id, organizationId: null, inviteeIds: [] };

    await tx.membership.deleteMany({ where: { organizationId: organization.id, userId: memberUserId } });
    await tx.membershipEvent.create({ data: { organizationId: organization.id, userId: memberUserId, type: "REMOVED" } });
    // Invitations they sent there stop counting
    const sent = { organizationId: organization.id, invitedById: memberUserId, status: "PENDING" as const };
    const revoked = await tx.invitation.findMany({ where: sent, select: { userId: true } });
    await tx.invitation.updateMany({ where: sent, data: { status: "REVOKED", respondedAt: new Date() } });
    return {
      subscriptionId: subscription.id,
      organizationId: organization.id,
      inviteeIds: revoked.flatMap((invitation) => (invitation.userId ? [invitation.userId] : [])),
    };
  });
}
