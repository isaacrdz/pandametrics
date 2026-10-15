"use server";

import * as z from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALES } from "@/i18n/config";
import { SURVEY_CODE_LENGTH } from "@/lib/surveys/code";
import { submitPublicResponse, type SubmitErrorCode } from "@/lib/surveys/public";

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

// First address of x-forwarded-for (the client as seen by the proxy), then x-real-ip
async function getClientIp(): Promise<string | null> {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || list.get("x-real-ip")?.trim() || null;
}

export async function submitSurveyResponse(raw: unknown): Promise<SubmitSurveyResult> {
  const parsed = submissionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "INVALID" };

  try {
    const result = submitPublicResponse(parsed.data, { ip: await getClientIp() });
    if (result.ok) {
      // The dashboard cards and the survey table count responses
      revalidatePath("/dashboard");
      revalidatePath("/surveys");
    }
    return result;
  } catch {
    return { ok: false, error: "INVALID" };
  }
}
