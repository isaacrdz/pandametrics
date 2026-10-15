import "server-only";

import { MOCK_USERS } from "@/lib/mock-data";
import { hashPassword } from "@/lib/users/password";
import type { User } from "@/types/survey";

// In-memory user store with the same functions the Prisma services will have, like the survey
// store. The password hash never leaves this module's callers on the server.

export type UserErrorCode = "NOT_FOUND" | "SELF_DEACTIVATE" | "LAST_OWNER";

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

export type StoredUser = User & { passwordHash: string | null };

// Every seeded user signs in with this password in development
const DEV_PASSWORD = "panda-dev-1";

const globalForStore = globalThis as unknown as { pandaUserStore?: Map<string, StoredUser> };

function getStore(): Map<string, StoredUser> {
  if (!globalForStore.pandaUserStore) {
    const passwordHash = hashPassword(DEV_PASSWORD);
    globalForStore.pandaUserStore = new Map(
      MOCK_USERS.map((user) => [user.id, { ...structuredClone(user), passwordHash }]),
    );
  }
  return globalForStore.pandaUserStore;
}

// Drops the hash, so callers can only hand plain users to the UI
function toUser(stored: StoredUser): User {
  const user: Partial<StoredUser> = structuredClone(stored);
  delete user.passwordHash;
  return user as User;
}

function isListed(user: StoredUser, organizationId: string): boolean {
  return user.organizationId === organizationId && user.deletedAt === null;
}

export function listUsers(organizationId: string): User[] {
  return [...getStore().values()].filter((user) => isListed(user, organizationId)).map(toUser);
}

export function getUser(organizationId: string, id: string): User | null {
  const user = getStore().get(id);
  return user && isListed(user, organizationId) ? toUser(user) : null;
}

// Any user, deleted or not: surveys keep showing who created them
export function getUserById(id: string): User | null {
  const user = getStore().get(id);
  return user ? toUser(user) : null;
}

type Change = "activate" | "deactivate" | "delete";

// Checks every id before touching any of them, so a bulk change is all or nothing
function getChangeTargets(scope: UserScope, ids: string[], change: Change): StoredUser[] {
  const store = getStore();
  const targets = [...new Set(ids)].map((id) => store.get(id));
  if (targets.some((user) => !user || !isListed(user, scope.organizationId))) {
    throw new UserServiceError("NOT_FOUND");
  }
  const users = targets as StoredUser[];
  if (change === "activate") return users;

  if (users.some((user) => user.id === scope.userId)) throw new UserServiceError("SELF_DEACTIVATE");

  // The organization must keep one active owner after the change
  const removed = new Set(users.map((user) => user.id));
  const ownersLeft = [...store.values()].filter(
    (user) => isListed(user, scope.organizationId) && user.role === "OWNER" && user.isActive && !removed.has(user.id),
  );
  if (ownersLeft.length === 0) throw new UserServiceError("LAST_OWNER");
  return users;
}

// Returns how many users actually changed
export function setUsersActive(scope: UserScope, ids: string[], isActive: boolean): number {
  const users = getChangeTargets(scope, ids, isActive ? "activate" : "deactivate");
  const now = new Date();
  let count = 0;
  for (const user of users) {
    if (user.isActive === isActive) continue;
    user.isActive = isActive;
    user.updatedAt = now;
    count++;
  }
  return count;
}

export function setUserActive(scope: UserScope, id: string, isActive: boolean): void {
  setUsersActive(scope, [id], isActive);
}

export function softDeleteUsers(scope: UserScope, ids: string[]): number {
  const users = getChangeTargets(scope, ids, "delete");
  const now = new Date();
  for (const user of users) {
    user.deletedAt = now;
    user.updatedAt = now;
  }
  return users.length;
}
