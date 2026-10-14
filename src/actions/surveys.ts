"use server";

import { refresh, revalidatePath } from "next/cache";
import { getAppContext } from "@/lib/dashboard";
import { toFormValues } from "@/lib/surveys/form-values";
import { surveyFormSchema, type SurveyFormInput, type SurveyFormValues } from "@/lib/surveys/schema";
import * as surveyService from "@/lib/surveys/service";
import { SurveyServiceError, type SurveyErrorCode } from "@/lib/surveys/service";

// Errors are codes, never text: the language lives in the browser, so the client translates them

export type SurveyActionErrorCode = SurveyErrorCode | "VALIDATION" | "UNKNOWN";

export interface FieldErrorItem {
  path: string;
  message: string;
}

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: SurveyActionErrorCode; fieldErrors?: FieldErrorItem[] } };

function getScope(): surveyService.SurveyScope {
  // Mock session until Auth.js: the organization and user never come from the client
  const { user, organization } = getAppContext();
  return { organizationId: organization.id, userId: user.id };
}

function toErrorResult(error: unknown): ActionResult<never> {
  if (error instanceof SurveyServiceError) return { success: false, error: { code: error.code } };
  console.error(error);
  return { success: false, error: { code: "UNKNOWN" } };
}

type Validation =
  | { ok: true; data: SurveyFormValues }
  | { ok: false; result: ActionResult<never> };

// The client already validated, but the server never trusts it
function validate(values: unknown): Validation {
  const parsed = surveyFormSchema.safeParse(values);
  if (parsed.success) return { ok: true, data: parsed.data };

  const fieldErrors = parsed.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
  return { ok: false, result: { success: false, error: { code: "VALIDATION", fieldErrors } } };
}

export async function createSurvey(values: SurveyFormInput): Promise<ActionResult<{ id: string }>> {
  const validation = validate(values);
  if (!validation.ok) return validation.result;

  try {
    const survey = surveyService.createSurvey(getScope(), validation.data);
    revalidatePath("/dashboard");
    return { success: true, data: { id: survey.id } };
  } catch (error) {
    return toErrorResult(error);
  }
}

// Soft delete: responses are kept; the client shows a toast and goes back to the dashboard
export async function deleteSurvey(id: string): Promise<ActionResult<null>> {
  try {
    surveyService.softDeleteSurvey(getScope(), id);
    revalidatePath("/dashboard");
    return { success: true, data: null };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function updateSurvey(
  id: string,
  values: SurveyFormInput,
): Promise<ActionResult<{ values: SurveyFormInput }>> {
  const validation = validate(values);
  if (!validation.ok) return validation.result;

  try {
    const survey = surveyService.updateSurvey(getScope(), id, validation.data);
    revalidatePath("/dashboard");
    refresh();
    // New questions and options now have ids: the form resets to these values
    return { success: true, data: { values: toFormValues(survey) } };
  } catch (error) {
    return toErrorResult(error);
  }
}
