import "server-only";

import { randomBytes, randomInt } from "node:crypto";
import { MOCK_SURVEYS, getAnsweredOptionIds } from "@/lib/mock-data";
import { ACTIVE_SURVEY_LIMIT, RATING_COLOR, RATING_VALUES } from "@/lib/surveys/constants";
import type { SurveyFormValues } from "@/lib/surveys/schema";
import type { AnswerOption, AnswerType, Question, Survey, SurveyCategory } from "@/types/survey";

// In-memory survey store with the same functions the Prisma services will have.
// It lives on globalThis so it survives Fast Refresh; it resets when the server restarts
// and is not shared between server processes (fine until Prisma).

export type SurveyErrorCode = "NOT_FOUND" | "ACTIVE_LIMIT" | "CATEGORY_LOCKED";

export class SurveyServiceError extends Error {
  constructor(readonly code: SurveyErrorCode) {
    super(code);
  }
}

export interface SurveyScope {
  organizationId: string;
  userId: string;
}

const globalForStore = globalThis as unknown as { pandaSurveyStore?: Map<string, Survey> };

function getStore(): Map<string, Survey> {
  globalForStore.pandaSurveyStore ??= new Map(
    MOCK_SURVEYS.map((survey) => [survey.id, structuredClone(survey)]),
  );
  return globalForStore.pandaSurveyStore;
}

const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_LENGTH = 6;
const RESERVED_CODES = ["SURVEY", "PUBLIC", "PANDA"];

function newObjectId(): string {
  return randomBytes(12).toString("hex");
}

function newCode(): string {
  const used = new Set([...getStore().values()].map((survey) => survey.code));
  for (;;) {
    const code = Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
    if (!used.has(code) && !RESERVED_CODES.some((token) => code.includes(token))) return code;
  }
}

function isVisible(survey: Survey, organizationId: string): boolean {
  return survey.organizationId === organizationId && survey.deletedAt === null;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function getSurvey(organizationId: string, id: string): Survey | null {
  const survey = getStore().get(id);
  return survey && isVisible(survey, organizationId) ? survey : null;
}

// Every visible survey, active and draft (the survey table sorts and filters them)
export function listSurveys(organizationId: string): Survey[] {
  return [...getStore().values()].filter((survey) => isVisible(survey, organizationId));
}

// Insertion order: seeded surveys first, new ones at the end (the Map keeps it)
export function listActiveSurveys(organizationId: string): Survey[] {
  return [...getStore().values()].filter((survey) => isVisible(survey, organizationId) && survey.isActive);
}

export function countActiveSurveys(organizationId: string): number {
  return listActiveSurveys(organizationId).length;
}

export function hasResponses(surveyId: string): boolean {
  return getAnsweredOptionIds(surveyId).size > 0;
}

// ---------------------------------------------------------------------------
// Options and questions
// ---------------------------------------------------------------------------

type OptionInput = SurveyFormValues["questions"][number]["options"][number];
type QuestionInput = SurveyFormValues["questions"][number];

const ANSWER_TYPE: Record<SurveyCategory, AnswerType> = {
  SATISFACTION: "REACTION",
  RATING: "RATING",
  POLL: "TEXT",
};

// `value` is what answers are tied to: changing it on an answered option creates a new option.
// Relabeling never does: responses keep a snapshot of the label (overview, section 4).
function normalizeOption(category: SurveyCategory, option: OptionInput, index: number) {
  if (category === "RATING") {
    return { value: RATING_VALUES[index], label: option.label || RATING_VALUES[index], color: RATING_COLOR };
  }
  // A poll option's value is fixed when it is created, so fixing a typo keeps its answers
  if (category === "POLL") return { value: option.value || option.label, label: option.label, color: option.color };
  return { value: option.value, label: option.label, color: option.color };
}

function ratingInputs(question: QuestionInput): OptionInput[] {
  // Exactly 5 options; labels come from the form (creator's locale) when present
  return RATING_VALUES.map((value, index) => ({
    id: question.options[index]?.id,
    value,
    label: question.options[index]?.label ?? value,
    color: RATING_COLOR,
  }));
}

function mergeOptions(
  category: SurveyCategory,
  stored: AnswerOption[],
  inputs: OptionInput[],
  answered: Set<string>,
  now: Date,
): AnswerOption[] {
  const type = ANSWER_TYPE[category];
  const byId = new Map(stored.filter((option) => !option.archivedAt).map((option) => [option.id, option]));
  const result: AnswerOption[] = [];
  const keptIds = new Set<string>();

  inputs.forEach((input, index) => {
    const next = normalizeOption(category, input, index);
    const existing = input.id ? byId.get(input.id) : undefined;

    if (existing && !(existing.value !== next.value && answered.has(existing.id))) {
      // Same answer identity (or no answers yet): update in place
      result.push({ ...existing, ...next });
      keptIds.add(existing.id);
      return;
    }
    // New option, or an answered option whose value changed: snapshots must stay true
    result.push({ id: newObjectId(), type, ...next, archivedAt: null });
  });

  // Options removed in the form (or replaced above) are archived, never deleted
  const archived = stored
    .filter((option) => option.archivedAt || !keptIds.has(option.id))
    .map((option) => (option.archivedAt ? option : { ...option, archivedAt: now }));

  return [...result, ...archived];
}

function mergeQuestions(
  category: SurveyCategory,
  stored: Question[],
  inputs: QuestionInput[],
  answered: Set<string>,
  now: Date,
): Question[] {
  const byId = new Map(stored.filter((question) => !question.archivedAt).map((question) => [question.id, question]));
  const keptIds = new Set<string>();

  const result = inputs.map((input) => {
    const existing = input.id ? byId.get(input.id) : undefined;
    const options = category === "RATING" ? ratingInputs(input) : input.options;
    if (existing) keptIds.add(existing.id);

    return {
      id: existing?.id ?? newObjectId(),
      text: input.text,
      options: mergeOptions(category, existing?.options ?? [], options, answered, now),
      archivedAt: null,
    };
  });

  const archived = stored
    .filter((question) => question.archivedAt || !keptIds.has(question.id))
    .map((question) => (question.archivedAt ? question : { ...question, archivedAt: now }));

  return [...result, ...archived];
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

function assertActiveLimit(organizationId: string, becomingActive: boolean) {
  if (becomingActive && countActiveSurveys(organizationId) >= ACTIVE_SURVEY_LIMIT) {
    throw new SurveyServiceError("ACTIVE_LIMIT");
  }
}

export function createSurvey(scope: SurveyScope, input: SurveyFormValues): Survey {
  assertActiveLimit(scope.organizationId, input.isActive);
  const now = new Date();

  const survey: Survey = {
    id: newObjectId(),
    organizationId: scope.organizationId,
    createdById: scope.userId,
    code: newCode(),
    name: input.name,
    description: input.description,
    category: input.category,
    isActive: input.isActive,
    questions: mergeQuestions(input.category, [], input.questions, new Set(), now),
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  getStore().set(survey.id, survey);
  return survey;
}

export function updateSurvey(scope: SurveyScope, id: string, input: SurveyFormValues): Survey {
  const stored = getSurvey(scope.organizationId, id);
  if (!stored) throw new SurveyServiceError("NOT_FOUND");

  const answered = getAnsweredOptionIds(id);
  const categoryChanged = stored.category !== input.category;
  if (categoryChanged && answered.size > 0) throw new SurveyServiceError("CATEGORY_LOCKED");

  assertActiveLimit(scope.organizationId, input.isActive && !stored.isActive);
  const now = new Date();

  // Without responses a new category simply replaces the questions
  const storedQuestions = categoryChanged ? [] : stored.questions;
  const inputs = categoryChanged
    ? input.questions.map((question) => ({
        ...question,
        id: undefined,
        options: question.options.map((option) => ({ ...option, id: undefined })),
      }))
    : input.questions;

  const updated: Survey = {
    ...stored,
    name: input.name,
    description: input.description,
    category: input.category,
    isActive: input.isActive,
    questions: mergeQuestions(input.category, storedQuestions, inputs, answered, now),
    updatedAt: now,
  };

  getStore().set(id, updated);
  return updated;
}

// Only the status changes: no form values, so the questions are never re-merged
export function setSurveyActive(scope: SurveyScope, id: string, isActive: boolean): void {
  setSurveysActive(scope, [id], isActive);
}

// All or nothing: every id must be visible, and activating must keep the organization
// within the limit counting every selected draft at once. Returns how many surveys changed.
export function setSurveysActive(scope: SurveyScope, ids: string[], isActive: boolean): number {
  const surveys = getVisibleSurveys(scope.organizationId, ids);
  const changing = surveys.filter((survey) => survey.isActive !== isActive);

  if (isActive && countActiveSurveys(scope.organizationId) + changing.length > ACTIVE_SURVEY_LIMIT) {
    throw new SurveyServiceError("ACTIVE_LIMIT");
  }

  const now = new Date();
  for (const survey of changing) {
    getStore().set(survey.id, { ...survey, isActive, updatedAt: now });
  }
  return changing.length;
}

export function softDeleteSurveys(scope: SurveyScope, ids: string[]): void {
  const surveys = getVisibleSurveys(scope.organizationId, ids);
  const now = new Date();
  for (const survey of surveys) {
    getStore().set(survey.id, { ...survey, isActive: false, deletedAt: now, updatedAt: now });
  }
}

// Unknown, deleted or another organization's id: NOT_FOUND before anything changes
function getVisibleSurveys(organizationId: string, ids: string[]): Survey[] {
  const surveys = [...new Set(ids)].map((id) => getSurvey(organizationId, id));
  if (surveys.length === 0 || surveys.some((survey) => !survey)) throw new SurveyServiceError("NOT_FOUND");
  return surveys as Survey[];
}

export function softDeleteSurvey(scope: SurveyScope, id: string): void {
  const stored = getSurvey(scope.organizationId, id);
  if (!stored) throw new SurveyServiceError("NOT_FOUND");

  const now = new Date();
  getStore().set(id, { ...stored, isActive: false, deletedAt: now, updatedAt: now });
}
