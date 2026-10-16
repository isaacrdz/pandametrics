"use server";

import * as z from "zod";
import { headers } from "next/headers";
import { updateTag } from "next/cache";
import { LOCALES } from "@/i18n/config";
import { SURVEY_CODE_LENGTH } from "@/lib/surveys/code";
import { surveysTag, surveyTag } from "@/lib/surveys/list";
import { submitPublicResponse, type SubmitErrorCode } from "@/lib/surveys/public";
import { clientIpFrom } from "@/server/client-ip";

// Public action (no session): the kiosk sends one response. Errors are codes the client translates

const submissionSchema = z.object({
  code: z.string().trim().toUpperCase().length(SURVEY_CODE_LENGTH),
  items: z
    .array(z.object({ questionId: z.string().min(1).max(64), answerOptionId: z.string().min(1).max(64) }))
    .min(1)
    .max(50),
  source: z.enum(["KIOSK", "LINK"]),
  deviceId: z.uuid().nullable(),
  locale: z.enum(LOCALES),
  durationMs: z.number().int().min(0),
});

export type SubmitSurveyResult = { ok: true } | { ok: false; error: SubmitErrorCode };

export async function submitSurveyResponse(raw: unknown): Promise<SubmitSurveyResult> {
  const parsed = submissionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "INVALID" };

  try {
    const result = await submitPublicResponse(parsed.data, { ip: clientIpFrom(await headers()) });
    if (!result.ok) return result;
    // The dashboard cards, the survey table and the edit form (category lock) count responses
    updateTag(surveysTag(result.organizationId));
    updateTag(surveyTag(result.surveyId));
    return { ok: true };
  } catch {
    return { ok: false, error: "INVALID" };
  }
}
