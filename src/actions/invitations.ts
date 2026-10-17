"use server";

import * as z from "zod";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { refresh, updateTag } from "next/cache";
import { DEFAULT_AFTER_SIGN_IN } from "@/lib/auth/paths";
import * as invitationService from "@/lib/invitations/service";
import { InvitationServiceError, type InvitationErrorCode } from "@/lib/invitations/service";
import { invitationsTag } from "@/lib/invitations/tags";
import { subscriptionTag } from "@/lib/plans/tags";
import { usersTag } from "@/lib/users/list";
import { baseSchema } from "@/lib/users/schema";
import { userTag } from "@/lib/users/tags";
import { ACTIVE_ORGANIZATION_COOKIE, ACTIVE_ORGANIZATION_COOKIE_OPTIONS } from "@/server/active-organization";
import { getAccountContext, getAppContext } from "@/server/app-context";
import { createRateLimiter } from "@/server/rate-limit";

// Errors are codes, never text: the client translates them

export type InvitationActionErrorCode = InvitationErrorCode | "RATE_LIMITED" | "VALIDATION" | "UNKNOWN";

export type InvitationActionResult =
  | { success: true }
  | { success: false; error: { code: InvitationActionErrorCode } };

const idSchema = z.string().min(1).max(64);
const emailSchema = baseSchema.shape.email;

// Invitations per inviter: 20 an hour
const inviteLimiter = createRateLimiter("invite", { windowMs: 60 * 60_000, max: 20 });

function failure(code: InvitationActionErrorCode): InvitationActionResult {
  return { success: false, error: { code } };
}

function toFailure(error: unknown): InvitationActionResult {
  if (error instanceof InvitationServiceError) return failure(error.code);
  console.error(error);
  return failure("UNKNOWN");
}

// The organization's pending list, the invitee's own (their sidebar count, /invitations) and, for a
// plan invite, the Business plan's members list
function afterInvitationChange(organizationId: string, inviteeId: string | null, subscriptionId: string | null = null) {
  updateTag(invitationsTag(organizationId));
  if (inviteeId) updateTag(userTag(inviteeId));
  if (subscriptionId) updateTag(subscriptionTag(subscriptionId));
}

// Owner or admin of a Pro organization invites an existing account by email
export async function inviteUser(email: string): Promise<InvitationActionResult> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return failure("VALIDATION");

  const { user, organization } = await getAppContext();
  if (!inviteLimiter.take([user.id])) return failure("RATE_LIMITED");
  try {
    const { inviteeId } = await invitationService.createInvitation(
      { organizationId: organization.id, userId: user.id },
      parsed.data,
    );
    afterInvitationChange(organization.id, inviteeId);
    refresh();
    return { success: true };
  } catch (error) {
    return toFailure(error);
  }
}

export async function revokeInvitation(id: string): Promise<InvitationActionResult> {
  // A malformed id is an invitation that does not exist; VALIDATION is only the invite email
  if (!idSchema.safeParse(id).success) return failure("INVITE_NOT_FOUND");
  const { user, organization } = await getAppContext();
  try {
    const { inviteeId, subscriptionId } = await invitationService.revokeInvitation(
      { organizationId: organization.id, userId: user.id },
      id,
    );
    afterInvitationChange(organization.id, inviteeId, subscriptionId);
    refresh();
    return { success: true };
  } catch (error) {
    return toFailure(error);
  }
}

// What accepting does: a plan invite cancels the user's own Individual plan, which the client asks
// about first
export async function previewInvitation(
  id: string,
): Promise<{ success: true; data: invitationService.InvitationPreview } | { success: false; error: { code: InvitationActionErrorCode } }> {
  if (!idSchema.safeParse(id).success) return { success: false, error: { code: "INVITE_NOT_FOUND" } };
  const { user } = await getAccountContext();
  try {
    return { success: true, data: await invitationService.getInvitationPreview(user.id, id) };
  } catch (error) {
    const result = toFailure(error);
    return result.success ? { success: false, error: { code: "UNKNOWN" } } : result;
  }
}

// Joins the organization (and, for a plan invite, the Business plan), makes it the active one and
// opens its dashboard; errors come back as codes. cancelIndividual confirms canceling the user's own
// Individual plan, which a plan invite requires
export async function acceptInvitation(id: string, cancelIndividual = false): Promise<InvitationActionResult> {
  // A malformed id is an invitation that does not exist; VALIDATION is only the invite email
  if (!idSchema.safeParse(id).success) return failure("INVITE_NOT_FOUND");
  const { user } = await getAccountContext();
  let organizationId: string;
  let subscriptionId: string | null;
  try {
    ({ organizationId, subscriptionId } = await invitationService.acceptInvitation(user.id, id, {
      cancelIndividual: cancelIndividual === true,
    }));
  } catch (error) {
    return toFailure(error);
  }

  afterInvitationChange(organizationId, user.id, subscriptionId);
  updateTag(usersTag(organizationId));
  (await cookies()).set(ACTIVE_ORGANIZATION_COOKIE, organizationId, ACTIVE_ORGANIZATION_COOKIE_OPTIONS);
  redirect(DEFAULT_AFTER_SIGN_IN);
}

export async function declineInvitation(id: string): Promise<InvitationActionResult> {
  // A malformed id is an invitation that does not exist; VALIDATION is only the invite email
  if (!idSchema.safeParse(id).success) return failure("INVITE_NOT_FOUND");
  const { user } = await getAccountContext();
  try {
    const { organizationId, subscriptionId } = await invitationService.declineInvitation(user.id, id);
    afterInvitationChange(organizationId, user.id, subscriptionId);
    refresh();
    return { success: true };
  } catch (error) {
    return toFailure(error);
  }
}
