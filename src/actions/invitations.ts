"use server";

import * as z from "zod";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { refresh, updateTag } from "next/cache";
import { DEFAULT_AFTER_SIGN_IN } from "@/lib/auth/paths";
import * as invitationService from "@/lib/invitations/service";
import { InvitationServiceError, type InvitationErrorCode } from "@/lib/invitations/service";
import { invitationsTag } from "@/lib/invitations/tags";
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

// The organization's pending list and the invitee's own (their sidebar count, /invitations)
function afterInvitationChange(organizationId: string, inviteeId: string | null) {
  updateTag(invitationsTag(organizationId));
  if (inviteeId) updateTag(userTag(inviteeId));
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
  if (!idSchema.safeParse(id).success) return failure("VALIDATION");
  const { user, organization } = await getAppContext();
  try {
    const { inviteeId } = await invitationService.revokeInvitation({ organizationId: organization.id, userId: user.id }, id);
    afterInvitationChange(organization.id, inviteeId);
    refresh();
    return { success: true };
  } catch (error) {
    return toFailure(error);
  }
}

// Joins the organization, makes it the active one and opens its dashboard; errors come back as codes
export async function acceptInvitation(id: string): Promise<InvitationActionResult> {
  if (!idSchema.safeParse(id).success) return failure("VALIDATION");
  const { user } = await getAccountContext();
  let organizationId: string;
  try {
    ({ organizationId } = await invitationService.acceptInvitation(user.id, id));
  } catch (error) {
    return toFailure(error);
  }

  afterInvitationChange(organizationId, user.id);
  updateTag(usersTag(organizationId));
  (await cookies()).set(ACTIVE_ORGANIZATION_COOKIE, organizationId, ACTIVE_ORGANIZATION_COOKIE_OPTIONS);
  redirect(DEFAULT_AFTER_SIGN_IN);
}

export async function declineInvitation(id: string): Promise<InvitationActionResult> {
  if (!idSchema.safeParse(id).success) return failure("VALIDATION");
  const { user } = await getAccountContext();
  try {
    const { organizationId } = await invitationService.declineInvitation(user.id, id);
    afterInvitationChange(organizationId, user.id);
    refresh();
    return { success: true };
  } catch (error) {
    return toFailure(error);
  }
}
