import "server-only";

import { randomBytes, randomInt } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { limitsFor } from "@/lib/plans/limits";
import type { PlanTier } from "@/lib/plans/plan";
import { RATING_COLOR, RATING_VALUES } from "@/lib/surveys/constants";
import type { SurveyFormValues } from "@/lib/surveys/schema";
import { organizationTier } from "@/server/plans";
import { prisma } from "@/server/prisma";
import type { AnswerOption, AnswerType, Question, Survey, SurveyCategory } from "@/types/survey";

// Surveys service on Prisma (Neon). Questions and options are archived, never deleted, once they
// may have answers; the active-survey limit (the organization owner's plan: 1 on Free, 5 on Pro) is
// an atomic counter on the organization (backed by the CHECK constraint of the init migration). See
// the overview, "Important schema notes".

export type SurveyErrorCode = "NOT_FOUND" | "ACTIVE_LIMIT" | "CATEGORY_LOCKED" | "NO_ORGANIZATION";

// ACTIVE_LIMIT says which limit was hit (the organization owner's plan), for the message
export interface ActiveLimitDetails {
  limit: number;
  tier: PlanTier;
}

export class SurveyServiceError extends Error {
  constructor(
    readonly code: SurveyErrorCode,
    readonly details?: ActiveLimitDetails,
  ) {
    super(code);
  }
}

export interface SurveyScope {
  organizationId: string;
  userId: string;
}

const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_LENGTH = 6;
const RESERVED_CODES = ["SURVEY", "PUBLIC", "PANDA"];
// A new code collides with an existing one only by chance; retry a few times before giving up
const CODE_ATTEMPTS = 5;

function newObjectId(): string {
  return randomBytes(12).toString("hex");
}

function newCode(): string {
  for (;;) {
    const code = Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
    if (!RESERVED_CODES.some((token) => code.includes(token))) return code;
  }
}

function isUniqueViolation(error: unknown, field: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    JSON.stringify(error.meta ?? {}).includes(field)
  );
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

// Current questions first (by position), archived ones after them: the order the form and the
// metrics expect
const SURVEY_INCLUDE = {
  questions: {
    orderBy: [{ archivedAt: { sort: "asc", nulls: "first" } }, { position: "asc" }],
    include: { options: { orderBy: [{ archivedAt: { sort: "asc", nulls: "first" } }, { position: "asc" }] } },
  },
} satisfies Prisma.SurveyInclude;

type SurveyRow = Prisma.SurveyGetPayload<{ include: typeof SURVEY_INCLUDE }>;

// The app's Survey type, without database-only columns (positions, foreign keys)
function toSurvey(row: SurveyRow): Survey {
  return {
    id: row.id,
    organizationId: row.organizationId,
    createdById: row.createdById,
    code: row.code,
    name: row.name,
    description: row.description,
    category: row.category,
    isActive: row.isActive,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    questions: row.questions.map((question) => ({
      id: question.id,
      text: question.text,
      archivedAt: question.archivedAt,
      options: question.options.map(({ id, type, value, label, color, archivedAt }) => ({
        id,
        type,
        value,
        label,
        color,
        archivedAt,
      })),
    })),
  };
}

function visibleIn(organizationId: string) {
  return { organizationId, deletedAt: null } satisfies Prisma.SurveyWhereInput;
}

export async function getSurvey(organizationId: string, id: string): Promise<Survey | null> {
  const row = await prisma.survey.findFirst({ where: { id, ...visibleIn(organizationId) }, include: SURVEY_INCLUDE });
  return row ? toSurvey(row) : null;
}

// Every visible survey, active and draft
export async function listSurveys(organizationId: string): Promise<Survey[]> {
  const rows = await prisma.survey.findMany({
    where: visibleIn(organizationId),
    include: SURVEY_INCLUDE,
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toSurvey);
}

// Active surveys, oldest first (the dashboard card order)
export async function listActiveSurveys(organizationId: string): Promise<Survey[]> {
  const rows = await prisma.survey.findMany({
    where: { ...visibleIn(organizationId), isActive: true },
    include: SURVEY_INCLUDE,
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toSurvey);
}

// Public lookup for the kiosk: codes are unique across organizations. Deleted surveys are hidden
export async function getSurveyByCode(code: string): Promise<Survey | null> {
  const row = await prisma.survey.findUnique({ where: { code: code.toUpperCase() }, include: SURVEY_INCLUDE });
  return row && row.deletedAt === null ? toSurvey(row) : null;
}

export async function countActiveSurveys(organizationId: string): Promise<number> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { activeSurveyCount: true },
  });
  return organization?.activeSurveyCount ?? 0;
}

// DISTINCT in SQL: Prisma's `distinct` would fetch every answer and dedupe in memory
async function getAnsweredOptionIds(tx: Prisma.TransactionClient, surveyId: string): Promise<Set<string>> {
  const rows = await tx.$queryRaw<{ answerOptionId: string }[]>`
    SELECT DISTINCT ri."answerOptionId"
    FROM "ResponseItem" ri
    JOIN "Question" q ON q.id = ri."questionId"
    WHERE q."surveyId" = ${surveyId}`;
  return new Set(rows.map((row) => row.answerOptionId));
}

export async function hasResponses(surveyId: string): Promise<boolean> {
  const item = await prisma.responseItem.findFirst({ where: { question: { surveyId } }, select: { id: true } });
  return item !== null;
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
// Persistence and the active-survey counter
// ---------------------------------------------------------------------------

// Writes the merged questions and options: current ones get their position, archived ones keep
// theirs and only gain archivedAt. Upserts by id, so nothing that may have answers is deleted.
// One INSERT … ON CONFLICT per table: a survey has up to dozens of rows, and one round trip per
// row to Neon would outlast the transaction timeout
async function writeQuestions(tx: Prisma.TransactionClient, surveyId: string, questions: Question[], now: Date) {
  let questionPosition = 0;
  const questionRows = questions.map((question) => {
    const position = question.archivedAt ? 0 : questionPosition++;
    return Prisma.sql`(${question.id}, ${surveyId}, ${question.text}, ${position}, ${question.archivedAt}::timestamp(3), ${now}::timestamp(3))`;
  });

  const optionRows = questions.flatMap((question) => {
    let optionPosition = 0;
    return question.options.map((option) => {
      const position = option.archivedAt ? 0 : optionPosition++;
      return Prisma.sql`(${option.id}, ${question.id}, ${option.type}::"AnswerType", ${option.value}, ${option.label},
        ${option.color}, ${position}, ${option.archivedAt}::timestamp(3), ${now}::timestamp(3))`;
    });
  });

  // An archived row keeps its last position (EXCLUDED carries 0 for it)
  if (questionRows.length > 0) {
    await tx.$executeRaw`
      INSERT INTO "Question" (id, "surveyId", text, position, "archivedAt", "createdAt")
      VALUES ${Prisma.join(questionRows)}
      ON CONFLICT (id) DO UPDATE SET
        text = EXCLUDED.text,
        "archivedAt" = EXCLUDED."archivedAt",
        position = CASE WHEN EXCLUDED."archivedAt" IS NULL THEN EXCLUDED.position ELSE "Question".position END`;
  }
  if (optionRows.length > 0) {
    await tx.$executeRaw`
      INSERT INTO "AnswerOption" (id, "questionId", type, value, label, color, position, "archivedAt", "createdAt")
      VALUES ${Prisma.join(optionRows)}
      ON CONFLICT (id) DO UPDATE SET
        value = EXCLUDED.value,
        label = EXCLUDED.label,
        color = EXCLUDED.color,
        "archivedAt" = EXCLUDED."archivedAt",
        position = CASE WHEN EXCLUDED."archivedAt" IS NULL THEN EXCLUDED.position ELSE "AnswerOption".position END`;
  }
}

// Adds `delta` active surveys to the organization's counter. Growing it only succeeds while it
// stays within the limit, in one guarded UPDATE, so concurrent activations cannot exceed it
async function changeActiveCount(tx: Prisma.TransactionClient, organizationId: string, delta: number) {
  if (delta === 0) return;
  if (delta < 0) {
    await tx.organization.update({ where: { id: organizationId }, data: { activeSurveyCount: { decrement: -delta } } });
    return;
  }
  // The limit is the owner's plan, read in this transaction: 1 on Free or expired, 5 on Pro. Only
  // growing is checked, so an organization above its limit after a downgrade can still edit and
  // deactivate (the CHECK of the init migration caps the counter at 5, the Pro maximum)
  const tier = await organizationTier(tx, organizationId, new Date());
  const { activeSurveys: limit } = limitsFor(tier);
  const { count } = await tx.organization.updateMany({
    where: { id: organizationId, activeSurveyCount: { lte: limit - delta } },
    data: { activeSurveyCount: { increment: delta } },
  });
  if (count === 0) throw new SurveyServiceError("ACTIVE_LIMIT", { limit, tier });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

// Neon's latency varies, and a survey write is several round trips: Prisma's 5 s default is too tight
const WRITE_TRANSACTION = { maxWait: 10_000, timeout: 15_000 };

export async function createSurvey(scope: SurveyScope, input: SurveyFormValues): Promise<Survey> {
  const now = new Date();
  const questions = mergeQuestions(input.category, [], input.questions, new Set(), now);

  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Only an active member creates surveys there, on every plan: a user removed or deactivated
        // since their page loaded gets NO_ORGANIZATION instead of a survey
        const membership = await tx.membership.count({
          where: { userId: scope.userId, organizationId: scope.organizationId, isActive: true },
        });
        if (membership === 0) throw new SurveyServiceError("NO_ORGANIZATION");

        if (input.isActive) await changeActiveCount(tx, scope.organizationId, 1);
        const survey = await tx.survey.create({
          data: {
            id: newObjectId(),
            organizationId: scope.organizationId,
            createdById: scope.userId,
            code: newCode(),
            name: input.name,
            description: input.description,
            category: input.category,
            isActive: input.isActive,
          },
        });
        await writeQuestions(tx, survey.id, questions, now);
        const created = await tx.survey.findUniqueOrThrow({ where: { id: survey.id }, include: SURVEY_INCLUDE });
        return toSurvey(created);
      }, WRITE_TRANSACTION);
    } catch (error) {
      // The code was taken by another survey: the whole transaction rolled back, try a new one
      if (isUniqueViolation(error, "code") && attempt < CODE_ATTEMPTS) continue;
      throw error;
    }
  }
}

export async function updateSurvey(scope: SurveyScope, id: string, input: SurveyFormValues): Promise<Survey> {
  return prisma.$transaction(async (tx) => {
    const row = await tx.survey.findFirst({ where: { id, ...visibleIn(scope.organizationId) }, include: SURVEY_INCLUDE });
    if (!row) throw new SurveyServiceError("NOT_FOUND");
    const stored = toSurvey(row);

    const answered = await getAnsweredOptionIds(tx, id);
    const categoryChanged = stored.category !== input.category;
    if (categoryChanged && answered.size > 0) throw new SurveyServiceError("CATEGORY_LOCKED");

    await changeActiveCount(tx, scope.organizationId, Number(input.isActive) - Number(stored.isActive));
    const now = new Date();

    // Without responses a new category simply replaces the questions: the old ones have no answers,
    // so they can go
    if (categoryChanged) {
      await tx.answerOption.deleteMany({ where: { question: { surveyId: id } } });
      await tx.question.deleteMany({ where: { surveyId: id } });
    }
    const storedQuestions = categoryChanged ? [] : stored.questions;
    const inputs = categoryChanged
      ? input.questions.map((question) => ({
          ...question,
          id: undefined,
          options: question.options.map((option) => ({ ...option, id: undefined })),
        }))
      : input.questions;

    await tx.survey.update({
      where: { id },
      data: { name: input.name, description: input.description, category: input.category, isActive: input.isActive },
    });
    await writeQuestions(tx, id, mergeQuestions(input.category, storedQuestions, inputs, answered, now), now);

    const updated = await tx.survey.findUniqueOrThrow({ where: { id }, include: SURVEY_INCLUDE });
    return toSurvey(updated);
  }, WRITE_TRANSACTION);
}

// Only the status changes: no form values, so the questions are never re-merged
export async function setSurveyActive(scope: SurveyScope, id: string, isActive: boolean): Promise<void> {
  await setSurveysActive(scope, [id], isActive);
}

// All or nothing: every id must be visible, and activating must keep the organization within the
// limit counting every selected draft at once. Returns how many surveys changed.
export async function setSurveysActive(scope: SurveyScope, ids: string[], isActive: boolean): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const surveys = await getVisibleSurveys(tx, scope.organizationId, ids);
    const changing = surveys.filter((survey) => survey.isActive !== isActive).map((survey) => survey.id);
    if (changing.length === 0) return 0;

    await changeActiveCount(tx, scope.organizationId, isActive ? changing.length : -changing.length);
    await tx.survey.updateMany({ where: { id: { in: changing } }, data: { isActive } });
    return changing.length;
  }, WRITE_TRANSACTION);
}

// Soft delete: questions, options and responses stay. Deleting an active survey frees its slot
export async function softDeleteSurveys(scope: SurveyScope, ids: string[]): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const surveys = await getVisibleSurveys(tx, scope.organizationId, ids);
    const activeCount = surveys.filter((survey) => survey.isActive).length;
    await tx.survey.updateMany({
      where: { id: { in: surveys.map((survey) => survey.id) } },
      data: { isActive: false, deletedAt: new Date() },
    });
    await changeActiveCount(tx, scope.organizationId, -activeCount);
  }, WRITE_TRANSACTION);
}

export async function softDeleteSurvey(scope: SurveyScope, id: string): Promise<void> {
  await softDeleteSurveys(scope, [id]);
}

// Unknown, deleted or another organization's id: NOT_FOUND before anything changes
async function getVisibleSurveys(tx: Prisma.TransactionClient, organizationId: string, ids: string[]) {
  const unique = [...new Set(ids)];
  const surveys = await tx.survey.findMany({
    where: { id: { in: unique }, ...visibleIn(organizationId) },
    select: { id: true, isActive: true },
  });
  if (unique.length === 0 || surveys.length !== unique.length) throw new SurveyServiceError("NOT_FOUND");
  return surveys;
}
