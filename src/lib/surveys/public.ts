import "server-only";

import { REACTION_VALUES } from "@/lib/surveys/constants";
import { getSurveyByCode } from "@/lib/surveys/service";
import type { AnswerOption, AnswerType, ReactionValue, SurveyCategory } from "@/types/survey";

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
