import "server-only";

import { cacheTag } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { endSeatsInOrganization } from "@/lib/plans/seats";
import { usersTag } from "@/lib/users/list";
import { userTag } from "@/lib/users/tags";
import { prisma } from "@/server/prisma";

// The signed-in user deletes their own account (/profile). The row stays (deletedAt) because
// surveys in other organizations still point at their creator, but everything personal is cleared
// and the email is freed, so the same address can sign up again as a new account.
// An owner deletes their organization with the account, only while nobody else is in it: other
// people never lose an organization they work in by surprise.

export type DeleteAccountErrorCode = "NOT_FOUND" | "ORGANIZATION_HAS_MEMBERS";

export class DeleteAccountError extends Error {
  constructor(readonly code: DeleteAccountErrorCode) {
    super(code);
  }
}

export interface AccountDeletionInfo {
  // The organization the user owns: deleted with the account, or the reason it can't be yet
  ownedOrganization: { name: string; otherMembers: number } | null;
}

// What the profile's delete card explains. Cached with the user's tag (creating an organization)
// and the owned organization's users tag (people joining or leaving it)
export async function getAccountDeletionInfo(userId: string): Promise<AccountDeletionInfo> {
  "use cache";
  cacheTag(userTag(userId));
  const organization = await prisma.organization.findUnique({ where: { ownerId: userId }, select: { id: true, name: true } });
  if (!organization) return { ownedOrganization: null };
  cacheTag(usersTag(organization.id));
  const otherMembers = await prisma.membership.count({ where: { organizationId: organization.id, userId: { not: userId } } });
  return { ownedOrganization: { name: organization.name, otherMembers } };
}

// Everything whose cached reads changed, for the action to expire
export interface DeletedAccount {
  // Organizations the user left (their lists and invitations changed) and the one deleted
  organizationIds: string[];
  subscriptionIds: string[];
  // Other people whose invitations or seats changed
  affectedUserIds: string[];
}

// Rows with a Restrict reference go first: responses (their items cascade), options, questions,
// surveys; deleting the organization then cascades its memberships, invitations and events
async function deleteOwnedOrganization(tx: Prisma.TransactionClient, organizationId: string) {
  const inOrganization = { organizationId };
  await tx.surveyResponse.deleteMany({ where: inOrganization });
  await tx.answerOption.deleteMany({ where: { question: { survey: inOrganization } } });
  await tx.question.deleteMany({ where: { survey: inOrganization } });
  await tx.survey.deleteMany({ where: inOrganization });
  await tx.organization.delete({ where: { id: organizationId } });
}

export async function deleteAccount(userId: string): Promise<DeletedAccount> {
  return prisma.$transaction(
    async (tx) => {
      // One deletion at a time, and nobody accepts an invitation into the owned organization
      // while it is checked (accepting locks the user, then the organization)
      const [user] = await tx.$queryRaw<{ deletedAt: Date | null }[]>`
        SELECT "deletedAt" FROM "User" WHERE id = ${userId} FOR UPDATE`;
      if (!user || user.deletedAt) throw new DeleteAccountError("NOT_FOUND");
      // Their plan before the organization, the order accepting a plan invitation uses
      await tx.$queryRaw`SELECT id FROM "Subscription" WHERE "userId" = ${userId} FOR UPDATE`;

      const owned = await tx.organization.findUnique({ where: { ownerId: userId }, select: { id: true } });
      const organizationIds: string[] = [];
      const subscriptionIds = new Set<string>();
      const affectedUserIds = new Set<string>();

      if (owned) {
        await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${owned.id} FOR UPDATE`;
        const others = await tx.membership.count({ where: { organizationId: owned.id, userId: { not: userId } } });
        if (others > 0) throw new DeleteAccountError("ORGANIZATION_HAS_MEMBERS");
        // People invited into it see the invitation disappear
        const invited = await tx.invitation.findMany({
          where: { organizationId: owned.id, status: "PENDING" },
          select: { userId: true },
        });
        for (const invitation of invited) if (invitation.userId) affectedUserIds.add(invitation.userId);
        await deleteOwnedOrganization(tx, owned.id);
        organizationIds.push(owned.id);
      }

      // Every other organization: as if the user left it (see leaveOrganization)
      const memberships = await tx.membership.findMany({ where: { userId }, select: { organizationId: true } });
      for (const { organizationId } of memberships) {
        const subscriptionId = await endSeatsInOrganization(tx, organizationId, [userId]);
        if (subscriptionId) subscriptionIds.add(subscriptionId);
        await tx.membershipEvent.create({ data: { organizationId, userId, type: "LEFT" } });
        organizationIds.push(organizationId);
      }
      await tx.membership.deleteMany({ where: { userId } });

      const now = new Date();
      // Invitations the user sent stop counting; the ones they received are answered
      const sent = { invitedById: userId, status: "PENDING" as const };
      const revoked = await tx.invitation.findMany({ where: sent, select: { userId: true, organizationId: true } });
      for (const invitation of revoked) {
        if (invitation.userId) affectedUserIds.add(invitation.userId);
        organizationIds.push(invitation.organizationId);
      }
      await tx.invitation.updateMany({ where: sent, data: { status: "REVOKED", respondedAt: now } });
      const received = { userId, status: "PENDING" as const };
      const declined = await tx.invitation.findMany({ where: received, select: { organizationId: true } });
      for (const invitation of declined) organizationIds.push(invitation.organizationId);
      await tx.invitation.updateMany({ where: received, data: { status: "DECLINED", respondedAt: now } });

      // Their own plan stops renewing. Its seats live in the owned organization, which had nobody
      // else, so none are left; any stray one is ended anyway
      const subscription = await tx.subscription.findUnique({ where: { userId }, select: { id: true, status: true } });
      if (subscription) {
        subscriptionIds.add(subscription.id);
        const seats = await tx.subscriptionSeat.findMany({ where: { subscriptionId: subscription.id }, select: { userId: true } });
        for (const seat of seats) affectedUserIds.add(seat.userId);
        await tx.subscriptionSeat.deleteMany({ where: { subscriptionId: subscription.id } });
        if (subscription.status === "ACTIVE" || subscription.status === "PAST_DUE") {
          await tx.subscription.update({ where: { id: subscription.id }, data: { status: "CANCELED", canceledAt: now } });
        }
      }
      const seat = await tx.subscriptionSeat.findUnique({ where: { userId }, select: { subscriptionId: true } });
      if (seat) {
        subscriptionIds.add(seat.subscriptionId);
        await tx.subscriptionSeat.delete({ where: { userId } });
      }

      // Sign-in links: Google signs the address up as a new account from now on
      await tx.account.deleteMany({ where: { userId } });
      await tx.session.deleteMany({ where: { userId } });
      await tx.user.update({
        where: { id: userId },
        data: {
          name: null,
          email: null,
          emailVerified: null,
          image: null,
          phone: null,
          passwordHash: null,
          isActive: false,
          deletedAt: now,
        },
      });

      affectedUserIds.delete(userId);
      return {
        organizationIds: [...new Set(organizationIds)],
        subscriptionIds: [...subscriptionIds],
        affectedUserIds: [...affectedUserIds],
      };
    },
    // An organization with many responses takes a few round trips to Neon
    { timeout: 60_000 },
  );
}
