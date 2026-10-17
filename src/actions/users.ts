"use server";

import * as z from "zod";
import { refresh, updateTag } from "next/cache";
import { getAppContext } from "@/server/app-context";
import { MAX_PAGE_SIZE } from "@/lib/table/pagination";
import { toUserFormValues, userFormSchema, type UserFormInput, type UserFormSchemaMode, type UserFormValues } from "@/lib/users/schema";
import { invitationsTag } from "@/lib/invitations/tags";
import { subscriptionTag } from "@/lib/plans/tags";
import { usersTag } from "@/lib/users/list";
import { userTag } from "@/lib/users/tags";
import * as userService from "@/lib/users/service";
import { UserServiceError, type UserErrorCode } from "@/lib/users/service";

// Errors are codes, never text: the language lives in the browser, so the client translates them

export type UserActionErrorCode = UserErrorCode | "VALIDATION" | "UNKNOWN";

export interface UserFieldError {
  path: string;
  message: string;
}

export type UserActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: UserActionErrorCode; fieldErrors?: UserFieldError[] } };

async function getScope(): Promise<userService.UserScope> {
  // From the session: the organization and user never come from the client
  const { user, organization } = await getAppContext();
  return { organizationId: organization.id, userId: user.id };
}

function toErrorResult(error: unknown): UserActionResult<never> {
  if (error instanceof UserServiceError) return { success: false, error: { code: error.code } };
  console.error(error);
  return { success: false, error: { code: "UNKNOWN" } };
}

// Expires the organization's cached user reads (list and count) and the cached app context of every
// changed user: a renamed user sees it in the sidebar, a deactivated or removed one loses this
// organization on their next request. The list re-renders with its filters (refresh); /surveys/[id]
// keeps showing "created by" because accounts are never deleted here
function afterChange(scope: userService.UserScope, ids: string[]) {
  updateTag(usersTag(scope.organizationId));
  for (const id of new Set(ids)) updateTag(userTag(id));
  refresh();
}

// Ids come from the client, so they are validated before the service sees them:
// a selection never spans more than one page
const idSchema = z.string().min(1).max(64);
const idsSchema = z.array(idSchema).min(1).max(MAX_PAGE_SIZE);
const VALIDATION_ERROR: UserActionResult<never> = { success: false, error: { code: "VALIDATION" } };

export async function setUserActive(id: string, isActive: boolean): Promise<UserActionResult<null>> {
  if (!idSchema.safeParse(id).success || typeof isActive !== "boolean") return VALIDATION_ERROR;
  try {
    const scope = await getScope();
    await userService.setUserActive(scope, id, isActive);
    afterChange(scope, [id]);
    return { success: true, data: null };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function setUsersActive(ids: string[], isActive: boolean): Promise<UserActionResult<{ count: number }>> {
  if (!idsSchema.safeParse(ids).success || typeof isActive !== "boolean") return VALIDATION_ERROR;
  try {
    // Users that already had this status are left alone and not counted
    const scope = await getScope();
    const count = await userService.setUsersActive(scope, ids, isActive);
    afterChange(scope, ids);
    return { success: true, data: { count } };
  } catch (error) {
    return toErrorResult(error);
  }
}

// From this organization only: the accounts stay
export async function removeUsers(ids: string[]): Promise<UserActionResult<{ count: number }>> {
  if (!idsSchema.safeParse(ids).success) return VALIDATION_ERROR;
  try {
    const scope = await getScope();
    const { count, subscriptionId, inviteeIds } = await userService.removeUsers(scope, ids);
    // Their seats in the owner's Business plan ended too
    if (subscriptionId) updateTag(subscriptionTag(subscriptionId));
    afterChange(scope, ids);
    // Pending invitations the removed users sent here were revoked
    updateTag(invitationsTag(scope.organizationId));
    for (const id of inviteeIds) updateTag(userTag(id));
    return { success: true, data: { count } };
  } catch (error) {
    return toErrorResult(error);
  }
}

// ---------------------------------------------------------------------------
// User form
// ---------------------------------------------------------------------------

type Validation =
  | { ok: true; data: UserFormValues }
  | { ok: false; result: UserActionResult<never> };

// The client already validated, but the server never trusts it
function validate(values: unknown, mode: UserFormSchemaMode): Validation {
  const parsed = userFormSchema(mode).safeParse(values);
  if (parsed.success) return { ok: true, data: parsed.data };

  const fieldErrors = parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
  return { ok: false, result: { success: false, error: { code: "VALIDATION", fieldErrors } } };
}

export async function updateUser(id: string, values: UserFormInput): Promise<UserActionResult<{ values: UserFormInput }>> {
  if (!idSchema.safeParse(id).success) return VALIDATION_ERROR;
  const validation = validate(values, "edit");
  if (!validation.ok) return validation.result;
  try {
    const scope = await getScope();
    const user = await userService.updateUser(scope, id, validation.data);
    afterChange(scope, [id]);
    // Normalized values with empty password fields: the form resets to them
    return { success: true, data: { values: toUserFormValues(user) } };
  } catch (error) {
    return toErrorResult(error);
  }
}

// Always the signed-in user (from the session), never an id sent by the client
export async function updateProfile(values: UserFormInput): Promise<UserActionResult<{ values: UserFormInput }>> {
  // The edit rules (an optional pair): the service changes the password only when the account
  // has one (with the current one); a Google sign-up has none and gets none here
  const validation = validate(values, "edit");
  if (!validation.ok) return validation.result;
  try {
    const scope = await getScope();
    const user = await userService.updateProfile(scope, validation.data);
    afterChange(scope, [scope.userId]);
    return { success: true, data: { values: toUserFormValues(user) } };
  } catch (error) {
    return toErrorResult(error);
  }
}
