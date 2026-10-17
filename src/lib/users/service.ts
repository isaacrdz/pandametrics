import "server-only";

import { cacheTag } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { endSeatsInOrganization } from "@/lib/plans/seats";
import { hashPassword, verifyPassword } from "@/lib/users/password";
import type { UserFormValues } from "@/lib/users/schema";
import { userTag } from "@/lib/users/tags";
import { prisma } from "@/server/prisma";
import type { User, UserAccount } from "@/types/survey";

// Users service on Prisma (Neon). A user belongs to an organization through a Membership, which
// holds their role and whether they are active there. The password hash is only read inside this
// module, to verify the current password, and never returned: every query that leaves it uses
// USER_PUBLIC_SELECT.

export type UserErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "SELF_DEACTIVATE"
  | "OWNER_PROTECTED"
  | "EMAIL_TAKEN"
  | "WRONG_PASSWORD";

export class UserServiceError extends Error {
  constructor(readonly code: UserErrorCode) {
    super(code);
  }
}

export interface UserScope {
  organizationId: string;
  // The signed-in user, who can never deactivate or remove themselves
  userId: string;
}

// Every column of the account (UserAccount), never passwordHash. Role and status come from the membership
export const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  phone: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const MEMBER_SELECT = { role: true, isActive: true, user: { select: USER_PUBLIC_SELECT } } satisfies Prisma.MembershipSelect;

type MemberRow = Prisma.MembershipGetPayload<{ select: typeof MEMBER_SELECT }>;

function toUser({ user, role, isActive }: MemberRow): User {
  return { ...user, role, isActive };
}

// Listed members: the organization's, with an account that is not soft deleted
function listedIn(organizationId: string) {
  return { organizationId, user: { deletedAt: null } } satisfies Prisma.MembershipWhereInput;
}

// A unique-constraint error on the email column
function isEmailTaken(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    JSON.stringify(error.meta ?? {}).includes("email")
  );
}

export async function listUsers(organizationId: string): Promise<User[]> {
  const rows = await prisma.membership.findMany({ where: listedIn(organizationId), select: MEMBER_SELECT });
  return rows.map(toUser);
}

export async function getUser(organizationId: string, id: string): Promise<User | null> {
  const row = await prisma.membership.findFirst({ where: { userId: id, ...listedIn(organizationId) }, select: MEMBER_SELECT });
  return row && toUser(row);
}

// Any account, deleted or not and in any organization: surveys keep showing who created them
export async function getUserById(id: string): Promise<UserAccount | null> {
  return prisma.user.findUnique({ where: { id }, select: USER_PUBLIC_SELECT });
}

type Change = "activate" | "deactivate" | "remove";

// Only the organization's owner and admins (active) manage other people there: deactivate, remove,
// edit. Members manage nobody
export async function canManageUsers(db: Prisma.TransactionClient | typeof prisma, scope: UserScope): Promise<boolean> {
  const membership = await db.membership.findUnique({
    where: { userId_organizationId: { userId: scope.userId, organizationId: scope.organizationId } },
    select: { role: true, isActive: true },
  });
  return Boolean(membership?.isActive && membership.role !== "MEMBER");
}

// Checks every id before touching any of them, so a bulk change is all or nothing
async function assertChangeAllowed(
  tx: Prisma.TransactionClient,
  scope: UserScope,
  ids: string[],
  change: Change,
): Promise<string[]> {
  if (!(await canManageUsers(tx, scope))) throw new UserServiceError("FORBIDDEN");
  const unique = [...new Set(ids)];
  const found = await tx.membership.count({ where: { userId: { in: unique }, ...listedIn(scope.organizationId) } });
  if (found !== unique.length) throw new UserServiceError("NOT_FOUND");
  if (change === "activate") return unique;

  if (unique.includes(scope.userId)) throw new UserServiceError("SELF_DEACTIVATE");

  // The owner's membership is never deactivated or removed
  const organization = await tx.organization.findUnique({ where: { id: scope.organizationId }, select: { ownerId: true } });
  if (organization && unique.includes(organization.ownerId)) throw new UserServiceError("OWNER_PROTECTED");
  return unique;
}

// In this organization only: the account and its other memberships are untouched. Returns how many
// users actually changed
export async function setUsersActive(scope: UserScope, ids: string[], isActive: boolean): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const targets = await assertChangeAllowed(tx, scope, ids, isActive ? "activate" : "deactivate");
    const { count } = await tx.membership.updateMany({
      where: { organizationId: scope.organizationId, userId: { in: targets }, isActive: !isActive },
      data: { isActive },
    });
    return count;
  });
}

export async function setUserActive(scope: UserScope, id: string, isActive: boolean): Promise<void> {
  await setUsersActive(scope, [id], isActive);
}

// Removes the users from this organization (their memberships). The accounts stay, so they can still
// sign in elsewhere, and their surveys keep "created by". Each removal is recorded for the owner's
// email (pending feature), and invitations the removed users sent here stop counting
// Returns how many left and who had a pending invitation from them (their caches change too)
export async function removeUsers(scope: UserScope, ids: string[]): Promise<{ count: number; subscriptionId: string | null; inviteeIds: string[] }> {
  return prisma.$transaction(async (tx) => {
    const targets = await assertChangeAllowed(tx, scope, ids, "remove");
    const { count } = await tx.membership.deleteMany({
      where: { organizationId: scope.organizationId, userId: { in: targets } },
    });
    // A seat in the owner's Business plan never outlives the membership
    const subscriptionId = await endSeatsInOrganization(tx, scope.organizationId, targets);
    await tx.membershipEvent.createMany({
      data: targets.map((userId) => ({ organizationId: scope.organizationId, userId, type: "REMOVED" as const })),
    });
    const sent = { organizationId: scope.organizationId, invitedById: { in: targets }, status: "PENDING" as const };
    const revoked = await tx.invitation.findMany({ where: sent, select: { userId: true } });
    await tx.invitation.updateMany({ where: sent, data: { status: "REVOKED", respondedAt: new Date() } });
    return { count, subscriptionId, inviteeIds: revoked.flatMap((invitation) => (invitation.userId ? [invitation.userId] : [])) };
  });
}

// ---------------------------------------------------------------------------
// Update (user form and profile). Users join by signing up; invitations come later
// ---------------------------------------------------------------------------

// Whether the user can sign in with a password; Google-only accounts have none. Never the hash.
// Cached with the user's tag: every password change (profile, user form, a Google takeover) expires
// it, and the profile page reads it outside Suspense
export async function hasPassword(id: string): Promise<boolean> {
  "use cache";
  cacheTag(userTag(id));
  const user = await prisma.user.findUnique({ where: { id }, select: { passwordHash: true } });
  return Boolean(user?.passwordHash);
}

// Your own account: name, email, phone and password (a new one needs the current one). Someone
// else's, as the organization's owner or an admin: only their name and phone. An account can belong
// to several organizations, so its email and password stay with its owner: changing them here would
// hand the account over (a new email can be claimed with Google). The owner is edited by nobody else
export async function updateUser(scope: UserScope, id: string, input: UserFormValues): Promise<User> {
  const membership = await prisma.membership.findFirst({
    where: { userId: id, ...listedIn(scope.organizationId) },
    select: { role: true, isActive: true, user: { select: { passwordHash: true } }, organization: { select: { ownerId: true } } },
  });
  if (!membership) throw new UserServiceError("NOT_FOUND");
  const { user, role, isActive } = membership;
  const isSelf = id === scope.userId;
  if (!isSelf) {
    if (!(await canManageUsers(prisma, scope))) throw new UserServiceError("FORBIDDEN");
    if (membership.organization.ownerId === id) throw new UserServiceError("OWNER_PROTECTED");
  }
  // Your own password always needs the current one, even when the edit comes from the
  // user form instead of the profile (the page redirects, but the action can be called directly).
  // Without one (Google-only), the first password is set without it
  if (isSelf && input.password && user.passwordHash && !verifyPassword(input.currentPassword, user.passwordHash)) {
    throw new UserServiceError("WRONG_PASSWORD");
  }

  try {
    const account = await prisma.user.update({
      where: { id },
      data: isSelf
        ? {
            name: input.name,
            email: input.email,
            phone: input.phone,
            ...(input.password ? { passwordHash: hashPassword(input.password) } : {}),
          }
        : { name: input.name, phone: input.phone },
      select: USER_PUBLIC_SELECT,
    });
    return { ...account, role, isActive };
  } catch (error) {
    if (isEmailTaken(error)) throw new UserServiceError("EMAIL_TAKEN");
    throw error;
  }
}

// The signed-in user's own profile: never another id. A new password needs the current one.
export async function updateProfile(scope: UserScope, input: UserFormValues): Promise<User> {
  // updateUser checks the current password whenever the id is the signed-in user's
  return updateUser(scope, scope.userId, input);
}
