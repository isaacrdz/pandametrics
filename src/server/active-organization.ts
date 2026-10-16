import "server-only";

import type { OrganizationMembership } from "@/types/survey";

// The organization the user is working in, remembered per browser. Only a hint: it is checked
// against the user's active memberships on every request, so a stale or forged id is ignored

export const ACTIVE_ORGANIZATION_COOKIE = "panda-org";

export const ACTIVE_ORGANIZATION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
} as const;

// The cookie's organization when the user is an active member there; otherwise the one they own,
// then the oldest membership (memberships come oldest first)
export function pickActiveMembership(
  memberships: OrganizationMembership[],
  userId: string,
  cookieOrganizationId: string | undefined,
): OrganizationMembership | undefined {
  return (
    memberships.find((membership) => membership.organization.id === cookieOrganizationId) ??
    memberships.find((membership) => membership.organization.ownerId === userId) ??
    memberships[0]
  );
}

// For the switcher: the owned organization first, then by name
export function sortMemberships(memberships: OrganizationMembership[], userId: string): OrganizationMembership[] {
  return [...memberships].sort((a, b) => {
    const owned = Number(b.organization.ownerId === userId) - Number(a.organization.ownerId === userId);
    return owned || a.organization.name.localeCompare(b.organization.name);
  });
}
