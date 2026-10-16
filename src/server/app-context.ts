import "server-only";

import { cache } from "react";
import { cacheTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { SIGN_IN_PATH } from "@/lib/auth/paths";
import { userTag } from "@/lib/users/tags";
import { USER_PUBLIC_SELECT } from "@/lib/users/service";
import { ACTIVE_ORGANIZATION_COOKIE, pickActiveMembership, sortMemberships } from "@/server/active-organization";
import { prisma } from "@/server/prisma";
import type { Organization, OrganizationMembership, Role, User, UserAccount } from "@/types/survey";

// Who the app acts as: the signed-in user (Auth.js session), the organizations they are an active
// member of and the one they are working in. The data access layer for every page and action; the
// proxy only checks that a session cookie exists.

export interface AppContext {
  // The account, with their role and status in the active organization
  user: User;
  organization: Organization;
  role: Role;
  // Active memberships, the owned organization first, then by name
  memberships: OrganizationMembership[];
  organizations: Organization[];
}

interface Account {
  user: UserAccount;
  // Active memberships, oldest first
  memberships: OrganizationMembership[];
}

// Cached across requests by user id (the email can change); membership changes expire the user's
// tag. null when the account can no longer use the app: deleted or inactive
async function loadAccount(userId: string): Promise<Account | null> {
  "use cache";
  cacheTag(userTag(userId));

  const row = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null, isActive: true },
    select: {
      ...USER_PUBLIC_SELECT,
      memberships: {
        where: { isActive: true },
        select: { role: true, organization: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!row) return null;

  const { memberships, ...user } = row;
  return { user, memberships };
}

// The signed-in user who can use the app, or null (no session, or a session of a user who was
// deactivated, deleted or is no longer an active member anywhere). The session and the
// active-organization cookie are request data: callers render inside Suspense. Deduplicated per
// request, since the layout and the page both ask
export const getSessionContext = cache(async (): Promise<AppContext | null> => {
  // Request time only: Auth.js makes a random CSRF token on every call, which a prerender rejects
  await connection();
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const account = await loadAccount(userId);
  if (!account) return null;

  const cookieOrganizationId = (await cookies()).get(ACTIVE_ORGANIZATION_COOKIE)?.value;
  const active = pickActiveMembership(account.memberships, userId, cookieOrganizationId);
  if (!active) return null;

  const memberships = sortMemberships(account.memberships, userId);
  return {
    user: { ...account.user, role: active.role, isActive: true },
    organization: active.organization,
    role: active.role,
    memberships,
    organizations: memberships.map((membership) => membership.organization),
  };
});

// For the admin pages and actions: the context, or a redirect to sign in
export async function getAppContext(): Promise<AppContext> {
  const context = await getSessionContext();
  if (!context) redirect(SIGN_IN_PATH);
  return context;
}
