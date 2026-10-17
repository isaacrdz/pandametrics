"use server";

import * as z from "zod";
import { refresh, updateTag } from "next/cache";
import * as invitationService from "@/lib/invitations/service";
import { InvitationServiceError, type InvitationErrorCode } from "@/lib/invitations/service";
import { invitationsTag } from "@/lib/invitations/tags";
import * as seatService from "@/lib/plans/seats";
import { SeatServiceError, type SeatErrorCode } from "@/lib/plans/seats";
import { subscriptionTag } from "@/lib/plans/tags";
import { usersTag } from "@/lib/users/list";
import { baseSchema } from "@/lib/users/schema";
import { userTag } from "@/lib/users/tags";
import { getAccountContext } from "@/server/app-context";
import { createRateLimiter } from "@/server/rate-limit";

// Settings → Plan, for the Business owner: invite people into the plan, revoke pending invites and
// remove members. Errors are codes; the client translates them

export type PlanActionErrorCode = InvitationErrorCode | SeatErrorCode | "RATE_LIMITED" | "VALIDATION" | "UNKNOWN";

export type PlanActionResult = { success: true } | { success: false; error: { code: PlanActionErrorCode } };

const idSchema = z.string().min(1).max(64);
const emailSchema = baseSchema.shape.email;

// Same allowance as organization invites: 20 an hour per owner
const planInviteLimiter = createRateLimiter("plan-invite", { windowMs: 60 * 60_000, max: 20 });

function failure(code: PlanActionErrorCode): PlanActionResult {
  return { success: false, error: { code } };
}

function toFailure(error: unknown): PlanActionResult {
  if (error instanceof InvitationServiceError || error instanceof SeatServiceError) return failure(error.code);
  console.error(error);
  return failure("UNKNOWN");
}

// The plan's members list, the organization's pending list and the invitee's own caches
function afterPlanChange(subscriptionId: string, organizationId: string | null, userIds: (string | null)[]) {
  updateTag(subscriptionTag(subscriptionId));
  if (organizationId) {
    updateTag(invitationsTag(organizationId));
    updateTag(usersTag(organizationId));
  }
  for (const id of new Set(userIds)) if (id) updateTag(userTag(id));
  refresh();
}

export async function invitePlanMember(email: string): Promise<PlanActionResult> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return failure("VALIDATION");

  const { user } = await getAccountContext();
  if (!planInviteLimiter.take([user.id])) return failure("RATE_LIMITED");
  try {
    const { inviteeId, organizationId, subscriptionId } = await invitationService.createPlanInvitation(user.id, parsed.data);
    afterPlanChange(subscriptionId, organizationId, [inviteeId]);
    return { success: true };
  } catch (error) {
    return toFailure(error);
  }
}

export async function revokePlanInvitation(id: string): Promise<PlanActionResult> {
  if (!idSchema.safeParse(id).success) return failure("INVITE_NOT_FOUND");
  const { user } = await getAccountContext();
  try {
    const { inviteeId, organizationId, subscriptionId } = await invitationService.revokePlanInvitation(user.id, id);
    afterPlanChange(subscriptionId, organizationId, [inviteeId]);
    return { success: true };
  } catch (error) {
    return toFailure(error);
  }
}

// Ends the member's seat and their membership in the owner's organization
export async function removePlanMember(memberUserId: string): Promise<PlanActionResult> {
  if (!idSchema.safeParse(memberUserId).success) return failure("NOT_FOUND");
  const { user } = await getAccountContext();
  try {
    const { subscriptionId, organizationId, inviteeIds } = await seatService.removeSeat(user.id, memberUserId);
    afterPlanChange(subscriptionId, organizationId, [memberUserId, ...inviteeIds]);
    return { success: true };
  } catch (error) {
    return toFailure(error);
  }
}
