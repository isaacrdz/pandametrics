"use server";

import * as z from "zod";
import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { ACTIVE_ORGANIZATION_COOKIE, ACTIVE_ORGANIZATION_COOKIE_OPTIONS } from "@/server/active-organization";
import { getAppContext } from "@/server/app-context";

// Errors are codes, never text: the client translates them

export type OrganizationActionResult =
  | { success: true }
  | { success: false; error: { code: "NOT_FOUND" | "VALIDATION" } };

const idSchema = z.string().min(1).max(64);

// Works in another organization: only one the user is an active member of. The cookie is a hint the
// app context checks on every request, so the page re-renders with that organization's data
export async function switchOrganization(organizationId: string): Promise<OrganizationActionResult> {
  if (!idSchema.safeParse(organizationId).success) return { success: false, error: { code: "VALIDATION" } };

  const { memberships } = await getAppContext();
  if (!memberships.some((membership) => membership.organization.id === organizationId)) {
    return { success: false, error: { code: "NOT_FOUND" } };
  }

  (await cookies()).set(ACTIVE_ORGANIZATION_COOKIE, organizationId, ACTIVE_ORGANIZATION_COOKIE_OPTIONS);
  refresh();
  return { success: true };
}
