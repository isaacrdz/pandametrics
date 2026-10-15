import "server-only";

import { randomBytes } from "node:crypto";
import { takeSubmissionSlot } from "@/lib/kiosk/rate-limit";
import { REACTION_VALUES } from "@/lib/surveys/constants";
import { addResponse } from "@/lib/surveys/responses";
import { getSurveyByCode } from "@/lib/surveys/service";
import type {
  AnswerOption,
  AnswerType,
  ReactionValue,
  ResponseItem,
  ResponseSource,
  SurveyCategory,
} from "@/types/survey";

// What the public kiosk receives: no organization, user or date fields, no archived content

export interface PublicAnswerOption {
  id: string;
  type: AnswerType;
  value: string;
  label: string;
  color: string;
}

export interface PublicQuestion {
  id: string;
  text: string;
  options: PublicAnswerOption[];
}

export interface PublicSurvey {
  code: string;
  name: string;
  category: SurveyCategory;
  questions: PublicQuestion[];
}

export type PublicSurveyResult =
  | { status: "ok"; survey: PublicSurvey }
  // Unknown code or deleted survey
  | { status: "notFound" }
  // Draft (inactive) survey: it exists but does not take answers
  | { status: "closed" };

// The kiosk shows faces from Very bad to Excellent and stars from 1 to 5, whatever order they were
// stored in, so keys 1–5 always mean the same thing. Poll options keep the owner's order
function kioskOrder(category: SurveyCategory, options: AnswerOption[]): AnswerOption[] {
  if (category === "SATISFACTION") {
    return [...options].sort(
      (a, b) => REACTION_VALUES.indexOf(a.value as ReactionValue) - REACTION_VALUES.indexOf(b.value as ReactionValue),
    );
  }
  if (category === "RATING") return [...options].sort((a, b) => Number(a.value) - Number(b.value));
  return options;
}

export function getPublicSurvey(code: string): PublicSurveyResult {
  const survey = getSurveyByCode(code);
  if (!survey) return { status: "notFound" };
  if (!survey.isActive) return { status: "closed" };

  return {
    status: "ok",
    survey: {
      code: survey.code,
      name: survey.name,
      category: survey.category,
      questions: survey.questions
        .filter((question) => !question.archivedAt)
        .map((question) => ({
          id: question.id,
          text: question.text,
          options: kioskOrder(survey.category, question.options)
            .filter((option) => !option.archivedAt)
            .map(({ id, type, value, label, color }) => ({ id, type, value, label, color })),
        })),
    },
  };
}

// ---------------------------------------------------------------------------
// Submissions
// ---------------------------------------------------------------------------

export type SubmitErrorCode = "NOT_FOUND" | "CLOSED" | "INVALID" | "RATE_LIMITED";

export interface PublicSubmission {
  code: string;
  items: { questionId: string; answerOptionId: string }[];
  source: Extract<ResponseSource, "KIOSK" | "LINK">;
  deviceId: string | null;
  locale: string;
  durationMs: number;
}

const MAX_DURATION_MS = 24 * 60 * 60_000;

// Validates a kiosk submission against the stored survey and saves it with a snapshot of each
// answer, so later edits to the survey never change what was answered
export function submitPublicResponse(
  input: PublicSubmission,
  meta: { ip: string | null; now?: Date },
): { ok: true } | { ok: false; error: SubmitErrorCode } {
  const survey = getSurveyByCode(input.code);
  if (!survey) return { ok: false, error: "NOT_FOUND" };
  if (!survey.isActive) return { ok: false, error: "CLOSED" };

  // Every current question exactly once, each with one of its current options
  const questions = survey.questions.filter((question) => !question.archivedAt);
  if (input.items.length !== questions.length) return { ok: false, error: "INVALID" };

  const answered = new Map(input.items.map((item) => [item.questionId, item.answerOptionId]));
  if (answered.size !== input.items.length) return { ok: false, error: "INVALID" };

  const items: ResponseItem[] = [];
  for (const question of questions) {
    const option = question.options.find((candidate) => candidate.id === answered.get(question.id) && !candidate.archivedAt);
    if (!option) return { ok: false, error: "INVALID" };
    items.push({
      questionId: question.id,
      answerOptionId: option.id,
      answerType: option.type,
      answerValue: option.value,
      answerLabel: option.label,
    });
  }

  const now = meta.now ?? new Date();
  const limitKeys = [input.deviceId && `device:${input.deviceId}`, meta.ip && `ip:${meta.ip}`].filter(
    (key): key is string => Boolean(key),
  );
  if (!takeSubmissionSlot(limitKeys, now.getTime())) return { ok: false, error: "RATE_LIMITED" };

  addResponse({
    id: randomBytes(12).toString("hex"),
    surveyId: survey.id,
    organizationId: survey.organizationId,
    items,
    source: input.source,
    deviceId: input.deviceId,
    locale: input.locale,
    durationMs: Math.min(Math.max(Math.round(input.durationMs), 0), MAX_DURATION_MS),
    createdAt: now,
  });
  return { ok: true };
}
