import "server-only";

import { cache } from "react";
import { cacheTag } from "next/cache";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { SIGN_IN_PATH } from "@/lib/auth/paths";
import { userTag } from "@/lib/users/tags";
import { USER_PUBLIC_SELECT } from "@/lib/users/service";
import { prisma } from "@/server/prisma";
import type { Organization, User } from "@/types/survey";

// Who the app acts as: the signed-in user (Auth.js session) and their organization. The data
// access layer for every page and action; the proxy only checks that a session cookie exists.

export interface AppContext {
  user: User;
  organization: Organization;
  // A user belongs to one organization, so the switcher lists only it
  organizations: Organization[];
}

// Cached across requests by user id (the email can change). null when the user can no longer use
// the app: deleted, inactive or without an organization
async function loadAppContext(userId: string): Promise<AppContext | null> {
  "use cache";
  cacheTag("app-context", userTag(userId));

  const row = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null, isActive: true },
    select: { ...USER_PUBLIC_SELECT, organization: true },
  });
  if (!row?.organization) return null;

  const { organization, ...user } = row;
  return { user, organization, organizations: [organization] };
}

// The signed-in user who can use the app, or null (no session, or a session of a user who was
// deactivated, deleted or lost their organization). The session cookie is request data: callers
// render inside Suspense. Deduplicated per request, since the layout and the page both ask
export const getSessionContext = cache(async (): Promise<AppContext | null> => {
  // Request time only: Auth.js makes a random CSRF token on every call, which a prerender rejects
  await connection();
  const session = await auth();
  return session?.user?.id ? loadAppContext(session.user.id) : null;
});

// For the admin pages and actions: the context, or a redirect to sign in
export async function getAppContext(): Promise<AppContext> {
  const context = await getSessionContext();
  if (!context) redirect(SIGN_IN_PATH);
  return context;
}
