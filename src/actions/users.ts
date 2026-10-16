"use server";

import * as z from "zod";
import { refresh, revalidatePath, updateTag } from "next/cache";
import { getAppContext } from "@/server/app-context";
import { MAX_PAGE_SIZE } from "@/lib/table/pagination";
import { toUserFormValues, userFormSchema, type UserFormInput, type UserFormSchemaMode, type UserFormValues } from "@/lib/users/schema";
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
  // Mock session until Auth.js: the organization and user never come from the client
  const { user, organization } = await getAppContext();
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
    userService.setUserActive(await getScope(), id, isActive);
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
    const count = userService.setUsersActive(await getScope(), ids, isActive);
    afterChange();
    return { success: true, data: { count } };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function deleteUsers(ids: string[]): Promise<UserActionResult<{ count: number }>> {
  if (!idsSchema.safeParse(ids).success) return VALIDATION_ERROR;
  try {
    const count = userService.softDeleteUsers(await getScope(), ids);
    afterChange();
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

export async function createUser(values: UserFormInput): Promise<UserActionResult<{ id: string }>> {
  const validation = validate(values, "create");
  if (!validation.ok) return validation.result;
  try {
    const user = userService.createUser(await getScope(), validation.data);
    revalidatePath("/users");
    return { success: true, data: { id: user.id } };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function updateUser(id: string, values: UserFormInput): Promise<UserActionResult<{ values: UserFormInput }>> {
  if (!idSchema.safeParse(id).success) return VALIDATION_ERROR;
  const validation = validate(values, "edit");
  if (!validation.ok) return validation.result;
  try {
    const scope = await getScope();
    const user = userService.updateUser(scope, id, validation.data);
    // Editing your own record changes the cached app context (sidebar name and greeting)
    if (id === scope.userId) updateTag("app-context");
    // Names show up in the sidebar, the greeting and "created by"
    revalidatePath("/", "layout");
    // Normalized values with empty password fields: the form resets to them
    return { success: true, data: { values: toUserFormValues(user) } };
  } catch (error) {
    return toErrorResult(error);
  }
}

// Always the signed-in user (from the session), never an id sent by the client
export async function updateProfile(values: UserFormInput): Promise<UserActionResult<{ values: UserFormInput }>> {
  const validation = validate(values, "profile");
  if (!validation.ok) return validation.result;
  try {
    const user = userService.updateProfile(await getScope(), validation.data);
    // The name shows up in the sidebar, the greeting, the user list and "created by". The cached app
    // context is expired by its shared tag (not "user:<email>": the edit may change the email)
    updateTag("app-context");
    revalidatePath("/", "layout");
    return { success: true, data: { values: toUserFormValues(user) } };
  } catch (error) {
    return toErrorResult(error);
  }
}
