import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { OrganizationValues } from "@/lib/organizations/schema";
import { MAX_MEMBERSHIPS } from "@/lib/plans/limits";
import { endSeatsInOrganization } from "@/lib/plans/seats";
import { prisma } from "@/server/prisma";
import type { Organization } from "@/types/survey";

// Organizations on Prisma. A user owns at most one (Organization.ownerId is unique) and belongs to at
// most MAX_MEMBERSHIPS, counting it (docs/subscriptions.md, section 5.3)

export type OrganizationErrorCode = "OWNER_LIMIT" | "MEMBERSHIP_LIMIT" | "NOT_FOUND" | "OWNER_CANNOT_LEAVE";

export class OrganizationServiceError extends Error {
  constructor(readonly code: OrganizationErrorCode) {
    super(code);
  }
}

function isOwnerTaken(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    JSON.stringify(error.meta ?? {}).includes("ownerId")
  );
}

// The user's own organization, with their OWNER membership. The user row is locked first, so two
// requests at once run one after the other and the second sees the first organization; the unique
// ownerId is the database's backstop
export async function createOrganization(userId: string, input: OrganizationValues): Promise<Organization> {
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;

      const owned = await tx.organization.count({ where: { ownerId: userId } });
      if (owned > 0) throw new OrganizationServiceError("OWNER_LIMIT");

      const memberships = await tx.membership.count({ where: { userId } });
      if (memberships >= MAX_MEMBERSHIPS) throw new OrganizationServiceError("MEMBERSHIP_LIMIT");

      const organization = await tx.organization.create({ data: { name: input.name, ownerId: userId } });
      await tx.membership.create({ data: { userId, organizationId: organization.id, role: "OWNER" } });
      return organization;
    });
  } catch (error) {
    if (isOwnerTaken(error)) throw new OrganizationServiceError("OWNER_LIMIT");
    throw error;
  }
}

// The user leaves an organization they belong to (not the one they own). Recorded for the owner's
// email (pending feature); pending invitations they sent there stop counting
// Returns who had a pending invitation from the user there
export async function leaveOrganization(userId: string, organizationId: string): Promise<{ subscriptionId: string | null; inviteeIds: string[] }> {
  return prisma.$transaction(async (tx) => {
    const membership = await tx.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      select: { organization: { select: { ownerId: true } } },
    });
    if (!membership) throw new OrganizationServiceError("NOT_FOUND");
    if (membership.organization.ownerId === userId) throw new OrganizationServiceError("OWNER_CANNOT_LEAVE");

    await tx.membership.delete({ where: { userId_organizationId: { userId, organizationId } } });
    // Leaving the Business owner's organization also leaves the plan
    const subscriptionId = await endSeatsInOrganization(tx, organizationId, [userId]);
    await tx.membershipEvent.create({ data: { organizationId, userId, type: "LEFT" } });
    const sent = { organizationId, invitedById: userId, status: "PENDING" as const };
    const revoked = await tx.invitation.findMany({ where: sent, select: { userId: true } });
    await tx.invitation.updateMany({ where: sent, data: { status: "REVOKED", respondedAt: new Date() } });
    return { subscriptionId, inviteeIds: revoked.flatMap((invitation) => (invitation.userId ? [invitation.userId] : [])) };
  });
}
