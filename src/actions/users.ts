"use server";

import * as z from "zod";
import { refresh, revalidatePath } from "next/cache";
import { getAppContext } from "@/lib/dashboard";
import { MAX_PAGE_SIZE } from "@/lib/table/pagination";
import * as userService from "@/lib/users/service";
import { UserServiceError, type UserErrorCode } from "@/lib/users/service";

// Errors are codes, never text: the language lives in the browser, so the client translates them

export type UserActionErrorCode = UserErrorCode | "VALIDATION" | "UNKNOWN";

export type UserActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: UserActionErrorCode } };

function getScope(): userService.UserScope {
  // Mock session until Auth.js: the organization and user never come from the client
  const { user, organization } = getAppContext();
  return { organizationId: organization.id, userId: user.id };
}

function toErrorResult(error: unknown): UserActionResult<never> {
  if (error instanceof UserServiceError) return { success: false, error: { code: error.code } };
  console.error(error);
  return { success: false, error: { code: "UNKNOWN" } };
}

// The list re-renders with its filters (refresh); /surveys/[id] keeps showing "created by"
// because the service never removes a user, it only marks them
function afterChange() {
  revalidatePath("/users");
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
    userService.setUserActive(getScope(), id, isActive);
    afterChange();
    return { success: true, data: null };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function setUsersActive(ids: string[], isActive: boolean): Promise<UserActionResult<{ count: number }>> {
  if (!idsSchema.safeParse(ids).success || typeof isActive !== "boolean") return VALIDATION_ERROR;
  try {
    // Users that already had this status are left alone and not counted
    const count = userService.setUsersActive(getScope(), ids, isActive);
    afterChange();
    return { success: true, data: { count } };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function deleteUsers(ids: string[]): Promise<UserActionResult<{ count: number }>> {
  if (!idsSchema.safeParse(ids).success) return VALIDATION_ERROR;
  try {
    const count = userService.softDeleteUsers(getScope(), ids);
    afterChange();
    return { success: true, data: { count } };
  } catch (error) {
    return toErrorResult(error);
  }
}
