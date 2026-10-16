import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { hashPassword, verifyPassword } from "@/lib/users/password";
import type { UserFormValues } from "@/lib/users/schema";
import { prisma } from "@/server/prisma";
import type { User } from "@/types/survey";

// Users service on Prisma (Neon). The password hash is only read inside this module, to verify the
// current password, and never returned: every query that leaves it uses USER_PUBLIC_SELECT.

export type UserErrorCode = "NOT_FOUND" | "SELF_DEACTIVATE" | "LAST_OWNER" | "EMAIL_TAKEN" | "WRONG_PASSWORD";

export class UserServiceError extends Error {
  constructor(readonly code: UserErrorCode) {
    super(code);
  }
}

export interface UserScope {
  organizationId: string;
  // The signed-in user, who can never deactivate or delete themselves
  userId: string;
}

// Every column of the User type, never passwordHash
export const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  phone: true,
  role: true,
  isActive: true,
  organizationId: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

// Listed users: the organization's, not soft deleted
function listedIn(organizationId: string) {
  return { organizationId, deletedAt: null } satisfies Prisma.UserWhereInput;
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
  return prisma.user.findMany({ where: listedIn(organizationId), select: USER_PUBLIC_SELECT });
}

export async function getUser(organizationId: string, id: string): Promise<User | null> {
  return prisma.user.findFirst({ where: { id, ...listedIn(organizationId) }, select: USER_PUBLIC_SELECT });
}

// Any user, deleted or not: surveys keep showing who created them
export async function getUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id }, select: USER_PUBLIC_SELECT });
}

type Change = "activate" | "deactivate" | "delete";

// Checks every id before touching any of them, so a bulk change is all or nothing
async function assertChangeAllowed(
  tx: Prisma.TransactionClient,
  scope: UserScope,
  ids: string[],
  change: Change,
): Promise<string[]> {
  const unique = [...new Set(ids)];
  const found = await tx.user.count({ where: { id: { in: unique }, ...listedIn(scope.organizationId) } });
  if (found !== unique.length) throw new UserServiceError("NOT_FOUND");
  if (change === "activate") return unique;

  if (unique.includes(scope.userId)) throw new UserServiceError("SELF_DEACTIVATE");

  // The organization must keep one active owner after the change
  const ownersLeft = await tx.user.count({
    where: { ...listedIn(scope.organizationId), role: "OWNER", isActive: true, id: { notIn: unique } },
  });
  if (ownersLeft === 0) throw new UserServiceError("LAST_OWNER");
  return unique;
}

// Returns how many users actually changed
export async function setUsersActive(scope: UserScope, ids: string[], isActive: boolean): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const targets = await assertChangeAllowed(tx, scope, ids, isActive ? "activate" : "deactivate");
    const { count } = await tx.user.updateMany({
      where: { id: { in: targets }, isActive: !isActive },
      data: { isActive },
    });
    return count;
  });
}

export async function setUserActive(scope: UserScope, id: string, isActive: boolean): Promise<void> {
  await setUsersActive(scope, [id], isActive);
}

// Soft delete: the email stays taken and the user's surveys keep their "created by"
export async function softDeleteUsers(scope: UserScope, ids: string[]): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const targets = await assertChangeAllowed(tx, scope, ids, "delete");
    const { count } = await tx.user.updateMany({ where: { id: { in: targets } }, data: { deletedAt: new Date() } });
    return count;
  });
}

// ---------------------------------------------------------------------------
// Create and update (user form)
// ---------------------------------------------------------------------------

// Emails are unique across the app, deleted users included (the unique index enforces it)
export async function createUser(scope: UserScope, input: UserFormValues): Promise<User> {
  try {
    return await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash: hashPassword(input.password),
        // Permissions are not editable yet: everyone joins as a member
        role: "MEMBER",
        isActive: true,
        organizationId: scope.organizationId,
      },
      select: USER_PUBLIC_SELECT,
    });
  } catch (error) {
    if (isEmailTaken(error)) throw new UserServiceError("EMAIL_TAKEN");
    throw error;
  }
}

// Name, email and phone; the password only changes when a new one was sent
export async function updateUser(scope: UserScope, id: string, input: UserFormValues): Promise<User> {
  const user = await prisma.user.findFirst({
    where: { id, ...listedIn(scope.organizationId) },
    select: { id: true, passwordHash: true },
  });
  if (!user) throw new UserServiceError("NOT_FOUND");
  // Your own password always needs the current one, even when the edit comes from the
  // user form instead of the profile (the page redirects, but the action can be called directly)
  if (id === scope.userId && input.password && !verifyPassword(input.currentPassword, user.passwordHash)) {
    throw new UserServiceError("WRONG_PASSWORD");
  }

  try {
    return await prisma.user.update({
      where: { id },
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        ...(input.password ? { passwordHash: hashPassword(input.password) } : {}),
      },
      select: USER_PUBLIC_SELECT,
    });
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
