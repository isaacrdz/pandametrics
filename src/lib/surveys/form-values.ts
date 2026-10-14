import {
  OPTION_LIMITS,
  POLL_FALLBACK_COLORS,
  RATING_COLOR,
  RATING_VALUES,
  REACTION_COLORS,
  REACTION_VALUES,
} from "@/lib/surveys/constants";
import type { OptionFormValue, QuestionFormValue, SurveyFormInput } from "@/lib/surveys/schema";
import type { ReactionValue, Survey, SurveyCategory } from "@/types/survey";

// Shared by the server (stored survey → form values) and the client (templates)

// Extra data the edit page passes to the form (share panel, category lock)
export interface SurveyFormMeta {
  id: string;
  code: string;
  publicUrl: string;
  createdAt: Date;
  createdBy: { name: string | null; email: string | null } | null;
  hasResponses: boolean;
}

export const EMPTY_SURVEY_VALUES: SurveyFormInput = {
  name: "",
  description: "",
  isActive: false,
  category: "",
  questions: [],
};

// Archived questions and options are never shown in the form; the service keeps them
export function toFormValues(survey: Survey): SurveyFormInput {
  return {
    name: survey.name,
    description: survey.description,
    isActive: survey.isActive,
    category: survey.category,
    questions: survey.questions
      .filter((question) => !question.archivedAt)
      .map((question) => ({
        id: question.id,
        text: question.text,
        options: question.options
          .filter((option) => !option.archivedAt)
          .map((option) => ({ id: option.id, value: option.value, label: option.label, color: option.color })),
      })),
  };
}

// Default labels come from the creator's active locale and are stored with the survey
export interface DefaultOptionLabels {
  reaction: (value: ReactionValue) => string;
  rating: (value: string) => string;
}

export function createReactionOption(value: ReactionValue, labels: DefaultOptionLabels): OptionFormValue {
  return { value, label: labels.reaction(value), color: REACTION_COLORS[value] };
}

export function createPollOption(index: number): OptionFormValue {
  return { value: "", label: "", color: POLL_FALLBACK_COLORS[index % POLL_FALLBACK_COLORS.length] };
}

export function createOptions(category: SurveyCategory, labels: DefaultOptionLabels): OptionFormValue[] {
  if (category === "SATISFACTION") return REACTION_VALUES.map((value) => createReactionOption(value, labels));
  if (category === "RATING") {
    return RATING_VALUES.map((value) => ({ value, label: labels.rating(value), color: RATING_COLOR }));
  }
  return Array.from({ length: OPTION_LIMITS.POLL.min }, (_, index) => createPollOption(index));
}

export function createQuestion(category: SurveyCategory, labels: DefaultOptionLabels): QuestionFormValue {
  return { text: "", options: createOptions(category, labels) };
}

// Changing the category keeps the question texts and rebuilds the options
export function applyCategory(
  questions: QuestionFormValue[],
  category: SurveyCategory,
  labels: DefaultOptionLabels,
): QuestionFormValue[] {
  if (questions.length === 0) return [createQuestion(category, labels)];
  return questions.map((question) => ({ text: question.text, options: createOptions(category, labels) }));
}

export function hasQuestionContent(questions: QuestionFormValue[]): boolean {
  return questions.some(
    (question) => question.text.trim() !== "" || question.options.some((option) => option.label.trim() !== ""),
  );
}
