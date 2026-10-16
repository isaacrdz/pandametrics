import "server-only";

import { cacheTag } from "next/cache";
import { getUserById } from "@/lib/users/service";
import { prisma } from "@/server/prisma";
import type { Organization, User } from "@/types/survey";

// Who the app acts as. There is no sign-in yet: the user comes from PANDA_DEV_USER_EMAIL (Jordan, the
// demo owner, by default) and is read from the database with their organization. Auth.js replaces
// only this module; every service already receives its scope from here.

const DEFAULT_DEV_USER_EMAIL = "jordan@acme.co";

export interface AppContext {
  user: User;
  organization: Organization;
  // A user belongs to one organization, so the switcher lists only it
  organizations: Organization[];
}

// Every user column except passwordHash, which never leaves the users service
const USER_PUBLIC_SELECT = {
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
} as const;

// Cached across requests, so the admin layout keeps a static shell. The tags expire it when the
// user's own record changes (profile edits) or the session context must reload
async function loadAppContext(email: string): Promise<AppContext> {
  "use cache";
  cacheTag("app-context", `user:${email}`);

  const row = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: { ...USER_PUBLIC_SELECT, organization: true },
  });

  if (!row) {
    throw new Error(`No user with the email "${email}" (PANDA_DEV_USER_EMAIL). Run "npx prisma db seed" or fix the variable.`);
  }
  if (!row.isActive) throw new Error(`The user "${email}" (PANDA_DEV_USER_EMAIL) is inactive.`);
  if (!row.organization) throw new Error(`The user "${email}" (PANDA_DEV_USER_EMAIL) has no organization.`);

  const { organization, ...dbUser } = row;
  // Until phase 2 moves the users service to Prisma, profile edits live in the in-memory user store:
  // prefer its copy so renames still show in the sidebar right away
  const user: User = getUserById(dbUser.id) ?? dbUser;

  return { user, organization, organizations: [organization] };
}

export async function getAppContext(): Promise<AppContext> {
  const email = (process.env.PANDA_DEV_USER_EMAIL ?? DEFAULT_DEV_USER_EMAIL).trim().toLowerCase();
  return loadAppContext(email);
}
