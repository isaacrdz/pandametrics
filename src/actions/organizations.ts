"use server";

import * as z from "zod";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { refresh, updateTag } from "next/cache";
import { DEFAULT_AFTER_SIGN_IN } from "@/lib/auth/paths";
import { organizationSchema, type OrganizationInput } from "@/lib/organizations/schema";
import * as organizationService from "@/lib/organizations/service";
import { OrganizationServiceError, type OrganizationErrorCode } from "@/lib/organizations/service";
import { invitationsTag } from "@/lib/invitations/tags";
import { subscriptionTag } from "@/lib/plans/tags";
import { usersTag } from "@/lib/users/list";
import { userTag } from "@/lib/users/tags";
import { ACTIVE_ORGANIZATION_COOKIE, ACTIVE_ORGANIZATION_COOKIE_OPTIONS } from "@/server/active-organization";
import { getAccountContext, getAppContext } from "@/server/app-context";

// Errors are codes, never text: the client translates them

export type OrganizationActionErrorCode = OrganizationErrorCode | "NOT_FOUND" | "VALIDATION" | "UNKNOWN";

export type OrganizationActionResult =
  | { success: true }
  | { success: false; error: { code: OrganizationActionErrorCode; fieldErrors?: { path: string; message: string }[] } };

const idSchema = z.string().min(1).max(64);

async function setActiveOrganization(organizationId: string) {
  (await cookies()).set(ACTIVE_ORGANIZATION_COOKIE, organizationId, ACTIVE_ORGANIZATION_COOKIE_OPTIONS);
}

// Works in another organization: only one the user is an active member of. The cookie is a hint the
// app context checks on every request, so the page re-renders with that organization's data
export async function switchOrganization(organizationId: string): Promise<OrganizationActionResult> {
  if (!idSchema.safeParse(organizationId).success) return { success: false, error: { code: "VALIDATION" } };

  const { memberships } = await getAppContext();
  if (!memberships.some((membership) => membership.organization.id === organizationId)) {
    return { success: false, error: { code: "NOT_FOUND" } };
  }

  await setActiveOrganization(organizationId);
  refresh();
  return { success: true };
}

// The signed-in user's own organization (/welcome). On success it becomes the active one and the
// user goes to its dashboard; errors come back as codes
export async function createOrganization(values: OrganizationInput): Promise<OrganizationActionResult> {
  const parsed = organizationSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors = parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
    return { success: false, error: { code: "VALIDATION", fieldErrors } };
  }

  const { user } = await getAccountContext();
  let organizationId: string;
  try {
    const organization = await organizationService.createOrganization(user.id, parsed.data);
    organizationId = organization.id;
  } catch (error) {
    if (error instanceof OrganizationServiceError) return { success: false, error: { code: error.code } };
    console.error(error);
    return { success: false, error: { code: "UNKNOWN" } };
  }

  updateTag(userTag(user.id));
  await setActiveOrganization(organizationId);
  redirect(DEFAULT_AFTER_SIGN_IN);
}

// The user leaves the organization they are working in (never the one they own). The cookie is
// cleared, so the next page falls back to their own organization, the oldest one left, or /welcome
export async function leaveOrganization(): Promise<OrganizationActionResult> {
  const { user, organization } = await getAppContext();
  let inviteeIds: string[];
  let subscriptionId: string | null;
  try {
    ({ inviteeIds, subscriptionId } = await organizationService.leaveOrganization(user.id, organization.id));
  } catch (error) {
    if (error instanceof OrganizationServiceError) return { success: false, error: { code: error.code } };
    console.error(error);
    return { success: false, error: { code: "UNKNOWN" } };
  }

  updateTag(userTag(user.id));
  updateTag(usersTag(organization.id));
  updateTag(invitationsTag(organization.id));
  // Leaving the owner's organization ended the seat in their Business plan
  if (subscriptionId) updateTag(subscriptionTag(subscriptionId));
  // Pending invitations the user sent there were revoked
  for (const id of inviteeIds) updateTag(userTag(id));
  (await cookies()).delete(ACTIVE_ORGANIZATION_COOKIE);
  redirect(DEFAULT_AFTER_SIGN_IN);
}
