import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { OrganizationValues } from "@/lib/organizations/schema";
import { MAX_MEMBERSHIPS } from "@/lib/plans/limits";
import { prisma } from "@/server/prisma";
import type { Organization } from "@/types/survey";

// Organizations on Prisma. A user owns at most one (Organization.ownerId is unique) and belongs to at
// most MAX_MEMBERSHIPS, counting it (docs/subscriptions.md, section 5.3)

export type OrganizationErrorCode = "OWNER_LIMIT" | "MEMBERSHIP_LIMIT";

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
