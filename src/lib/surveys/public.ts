import "server-only";

import { getSurveyByCode } from "@/lib/surveys/service";
import type { AnswerType, SurveyCategory } from "@/types/survey";

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
          options: question.options
            .filter((option) => !option.archivedAt)
            .map(({ id, type, value, label, color }) => ({ id, type, value, label, color })),
        })),
    },
  };
}
