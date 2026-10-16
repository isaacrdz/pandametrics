import "server-only";

import { cache } from "react";
import { cacheTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { SIGN_IN_PATH, WELCOME_PATH } from "@/lib/auth/paths";
import { userTag } from "@/lib/users/tags";
import { USER_PUBLIC_SELECT } from "@/lib/users/service";
import { ACTIVE_ORGANIZATION_COOKIE, pickActiveMembership, sortMemberships } from "@/server/active-organization";
import { prisma } from "@/server/prisma";
import type { Organization, OrganizationMembership, Role, User, UserAccount } from "@/types/survey";

// Who the app acts as: the signed-in user (Auth.js session), the organizations they are an active
// member of and the one they are working in. The data access layer for every page and action; the
// proxy only checks that a session cookie exists. Two levels:
//   - the account (getAccountContext): any signed-in user, with or without an organization
//   - the app (getAppContext): also working in an organization; the admin pages and actions

export interface AccountContext {
  user: UserAccount;
  // Active memberships, the owned organization first, then by name
  memberships: OrganizationMembership[];
  organizations: Organization[];
  // false: the user may still create their own organization
  ownsOrganization: boolean;
  // The organization the user is working in, null without any active membership
  organization: Organization | null;
  role: Role | null;
}

export interface AppContext extends AccountContext {
  // The account, with their role and status in the active organization
  user: User;
  organization: Organization;
  role: Role;
}

interface Account {
  user: UserAccount;
  // Active memberships, oldest first
  memberships: OrganizationMembership[];
  ownsOrganization: boolean;
}

// Cached across requests by user id (the email can change); membership and organization changes
// expire the user's tag. null when the account can no longer use the app: deleted or inactive
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
      ownedOrganization: { select: { id: true } },
    },
  });
  if (!row) return null;

  const { memberships, ownedOrganization, ...user } = row;
  return { user, memberships, ownsOrganization: ownedOrganization !== null };
}

// The signed-in account, or null (no session, or a deactivated / deleted account). The session and
// the active-organization cookie are request data: callers render inside Suspense. Deduplicated
// per request, since the layout and the page both ask
export const getSessionAccount = cache(async (): Promise<AccountContext | null> => {
  // Request time only: Auth.js makes a random CSRF token on every call, which a prerender rejects
  await connection();
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const account = await loadAccount(userId);
  if (!account) return null;

  const cookieOrganizationId = (await cookies()).get(ACTIVE_ORGANIZATION_COOKIE)?.value;
  const active = pickActiveMembership(account.memberships, userId, cookieOrganizationId);
  const memberships = sortMemberships(account.memberships, userId);
  return {
    user: account.user,
    memberships,
    organizations: memberships.map((membership) => membership.organization),
    ownsOrganization: account.ownsOrganization,
    organization: active?.organization ?? null,
    role: active?.role ?? null,
  };
});

export type SessionAppContext =
  | { status: "signed-out" }
  | { status: "no-organization"; account: AccountContext }
  | { status: "ok"; context: AppContext };

function toAppContext(account: AccountContext): AppContext | null {
  const { organization, role } = account;
  if (!organization || !role) return null;
  return { ...account, user: { ...account.user, role, isActive: true }, organization, role };
}

// For Server Actions, which answer with an error code instead of redirecting
export async function getSessionAppContext(): Promise<SessionAppContext> {
  const account = await getSessionAccount();
  if (!account) return { status: "signed-out" };
  const context = toAppContext(account);
  return context ? { status: "ok", context } : { status: "no-organization", account };
}

// Any signed-in user (/welcome, /profile): the account, or a redirect to sign in
export async function getAccountContext(): Promise<AccountContext> {
  const account = await getSessionAccount();
  if (!account) redirect(SIGN_IN_PATH);
  return account;
}

// The organization pages and actions: the context, a redirect to sign in, or to /welcome when the
// user has no organization yet
export async function getAppContext(): Promise<AppContext> {
  const session = await getSessionAppContext();
  if (session.status === "signed-out") redirect(SIGN_IN_PATH);
  if (session.status === "no-organization") redirect(WELCOME_PATH);
  return session.context;
}
