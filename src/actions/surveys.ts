"use server";

import * as z from "zod";
import { refresh, updateTag } from "next/cache";
import { getAppContext } from "@/server/app-context";
import { toFormValues } from "@/lib/surveys/form-values";
import { surveysTag, surveyTag } from "@/lib/surveys/list";
import { MAX_PAGE_SIZE } from "@/lib/table/pagination";
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

async function getScope(): Promise<surveyService.SurveyScope> {
  // From the session: the organization and user never come from the client
  const { user, organization } = await getAppContext();
  return { organizationId: organization.id, userId: user.id };
}

// Expires the cached reads (dashboard cards, survey table, top bar count, edit forms) so the next
// render reads the change (read-your-own-writes)
function afterChange(scope: surveyService.SurveyScope, ids: string[] = []) {
  updateTag(surveysTag(scope.organizationId));
  for (const id of new Set(ids)) updateTag(surveyTag(id));
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
    const scope = await getScope();
    const survey = await surveyService.createSurvey(scope, validation.data);
    afterChange(scope, [survey.id]);
    return { success: true, data: { id: survey.id } };
  } catch (error) {
    return toErrorResult(error);
  }
}

// Soft delete: responses are kept. The form goes back to the dashboard; the table stays and
// re-renders (refresh)
export async function deleteSurvey(id: string): Promise<ActionResult<null>> {
  try {
    const scope = await getScope();
    await surveyService.softDeleteSurvey(scope, id);
    afterChange(scope, [id]);
    refresh();
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
    const scope = await getScope();
    const survey = await surveyService.updateSurvey(scope, id, validation.data);
    afterChange(scope, [id]);
    refresh();
    // New questions and options now have ids: the form resets to these values
    return { success: true, data: { values: toFormValues(survey) } };
  } catch (error) {
    return toErrorResult(error);
  }
}

// From the survey table: the current page re-renders with its filters (refresh), and the server
// clamps the page when the last one empties.
// Ids and flags come from the client too, so they are validated before the service sees them:
// a selection never spans more than one page.
const idSchema = z.string().min(1).max(64);
const idsSchema = z.array(idSchema).min(1).max(MAX_PAGE_SIZE);
const VALIDATION_ERROR: ActionResult<never> = { success: false, error: { code: "VALIDATION" } };

export async function setSurveyActive(id: string, isActive: boolean): Promise<ActionResult<null>> {
  if (!idSchema.safeParse(id).success || typeof isActive !== "boolean") return VALIDATION_ERROR;
  try {
    const scope = await getScope();
    await surveyService.setSurveyActive(scope, id, isActive);
    afterChange(scope, [id]);
    refresh();
    return { success: true, data: null };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function setSurveysActive(ids: string[], isActive: boolean): Promise<ActionResult<{ count: number }>> {
  if (!idsSchema.safeParse(ids).success || typeof isActive !== "boolean") return VALIDATION_ERROR;
  try {
    // Surveys that already had this status are left alone and not counted
    const scope = await getScope();
    const count = await surveyService.setSurveysActive(scope, ids, isActive);
    afterChange(scope, ids);
    refresh();
    return { success: true, data: { count } };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function deleteSurveys(ids: string[]): Promise<ActionResult<{ count: number }>> {
  if (!idsSchema.safeParse(ids).success) return VALIDATION_ERROR;
  try {
    const scope = await getScope();
    await surveyService.softDeleteSurveys(scope, ids);
    afterChange(scope, ids);
    refresh();
    return { success: true, data: { count: new Set(ids).size } };
  } catch (error) {
    return toErrorResult(error);
  }
}
