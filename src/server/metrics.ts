import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/prisma";
import type { DateRange, Question, QuestionMetrics, Survey, SurveyCategory, SurveyMetrics } from "@/types/survey";

// Survey metrics computed in Postgres (section 6 of the overview): answers per option and responses
// per survey in a date range. Never stored. Callers cache them (the dashboard data is "use cache"
// tagged with the organization and each survey), so these functions only query.

// Archived options stay while they have answers in the range; ratings get their average
export function buildQuestionMetrics(
  question: Question,
  category: SurveyCategory,
  counts: Map<string, number>,
): QuestionMetrics {
  const withCounts = question.options
    .map((option) => ({ option, count: counts.get(option.id) ?? 0 }))
    .filter(({ option, count }) => !option.archivedAt || count > 0);

  const totalAnswers = withCounts.reduce((sum, { count }) => sum + count, 0);
  const weighted = withCounts.reduce((sum, { option, count }) => sum + Number(option.value) * count, 0);

  return {
    questionId: question.id,
    text: question.text,
    totalAnswers,
    average:
      category === "RATING" && totalAnswers > 0
        ? Math.round((weighted / totalAnswers) * 10) / 10
        : null,
    options: withCounts.map(({ option, count }) => ({
      optionId: option.id,
      type: option.type,
      value: option.value,
      label: option.label,
      color: option.color,
      count,
      share: totalAnswers > 0 ? count / totalAnswers : 0,
      archived: option.archivedAt !== null,
    })),
  };
}

function toSurveyMetrics(survey: Survey, totalResponses: number, counts: Map<string, number>): SurveyMetrics {
  return {
    surveyId: survey.id,
    totalResponses,
    questions: survey.questions
      .filter((question) => !question.archivedAt)
      .map((question) => buildQuestionMetrics(question, survey.category, counts)),
  };
}

// Every given survey of the organization in two grouped queries (answers per option, responses per
// survey), never one query per survey. The organization filter keeps foreign ids out
export async function getOrganizationMetrics(
  organizationId: string,
  surveys: Survey[],
  range: DateRange,
): Promise<Map<string, SurveyMetrics>> {
  const result = new Map<string, SurveyMetrics>();
  if (surveys.length === 0) return result;

  const ids = surveys.map((survey) => survey.id);
  const inRange = Prisma.sql`r."organizationId" = ${organizationId}
    AND r."surveyId" = ANY(${ids}::text[])
    AND r."createdAt" >= ${range.from} AND r."createdAt" < ${range.to}`;

  const [optionRows, responseRows] = await Promise.all([
    prisma.$queryRaw<{ answerOptionId: string; count: number }[]>`
      SELECT ri."answerOptionId", COUNT(*)::int AS count
      FROM "ResponseItem" ri
      JOIN "SurveyResponse" r ON r.id = ri."responseId"
      WHERE ${inRange}
      GROUP BY ri."answerOptionId"`,
    prisma.$queryRaw<{ surveyId: string; count: number }[]>`
      SELECT r."surveyId", COUNT(*)::int AS count
      FROM "SurveyResponse" r
      WHERE ${inRange}
      GROUP BY r."surveyId"`,
  ]);

  // Option ids are unique across surveys, so one map serves every card
  const counts = new Map(optionRows.map((row) => [row.answerOptionId, row.count]));
  const totals = new Map(responseRows.map((row) => [row.surveyId, row.count]));
  for (const survey of surveys) result.set(survey.id, toSurveyMetrics(survey, totals.get(survey.id) ?? 0, counts));
  return result;
}

export async function getSurveyMetrics(survey: Survey, range: DateRange): Promise<SurveyMetrics> {
  const metrics = await getOrganizationMetrics(survey.organizationId, [survey], range);
  return metrics.get(survey.id)!;
}
