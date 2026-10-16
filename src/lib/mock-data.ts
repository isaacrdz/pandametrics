// Mock data that follows the Prisma schema in context/project-overview.md, plus the metrics the
// dashboard reads from it. Deterministic (fixed date and seeded random), so server and client
// render the same values.

import type {
  DateRange,
  Organization,
  Question,
  QuestionMetrics,
  Survey,
  SurveyCategory,
  SurveyMetrics,
  SurveyResponse,
  User,
} from "@/types/survey";
import { DAY_MS, buildAllResponses, buildOrganizations, buildSurveys, buildUsers } from "@/lib/seed-data";
import { listResponses } from "@/lib/surveys/responses";

export const MOCK_NOW = new Date("2026-10-13T18:00:00.000Z");

// The data itself lives in src/lib/seed-data.ts, shared with the database seed; the mock builds it
// on its fixed clock so the app renders the same values on the server and the client
export { POLL_FALLBACK_COLORS, RATING_COLORS, REACTION_OPTIONS } from "@/lib/seed-data";

export const MOCK_ORGANIZATIONS: Organization[] = buildOrganizations(MOCK_NOW);

export const MOCK_USERS: User[] = buildUsers(MOCK_NOW);

export const MOCK_CURRENT_USER = MOCK_USERS[0];

export const MOCK_CURRENT_ORGANIZATION = MOCK_ORGANIZATIONS[0];

export const MOCK_SURVEYS: Survey[] = buildSurveys(MOCK_NOW);

export const MOCK_RESPONSES: SurveyResponse[] = buildAllResponses(MOCK_SURVEYS, MOCK_NOW);

// ---------------------------------------------------------------------------
// Metrics (same definitions as section 6 of the overview)
// ---------------------------------------------------------------------------

export const LAST_30_DAYS: DateRange = {
  from: new Date(MOCK_NOW.getTime() - 30 * DAY_MS),
  to: new Date(MOCK_NOW.getTime() + DAY_MS),
};

// The mock lives on a fixed clock (MOCK_NOW). Kiosk submissions are stamped with the real time,
// which is later, so they count as the mock's "now" and land in every range that includes today
function inRange(response: SurveyResponse, range: DateRange): boolean {
  const at = response.createdAt > MOCK_NOW ? MOCK_NOW : response.createdAt;
  return at >= range.from && at < range.to;
}

function buildQuestionMetrics(
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

// Surveys come from the survey store (src/lib/surveys/service.ts), responses from the response
// store (src/lib/surveys/responses.ts: the mock responses plus kiosk submissions)
export function getMockSurveyMetrics(survey: Survey, range: DateRange = LAST_30_DAYS): SurveyMetrics {
  const surveyId = survey.id;
  const responses = listResponses(surveyId).filter((r) => inRange(r, range));
  const counts = new Map<string, number>();
  for (const response of responses) {
    for (const item of response.items) {
      counts.set(item.answerOptionId, (counts.get(item.answerOptionId) ?? 0) + 1);
    }
  }

  return {
    surveyId,
    totalResponses: responses.length,
    questions: survey.questions
      .filter((question) => !question.archivedAt)
      .map((question) => buildQuestionMetrics(question, survey.category, counts)),
  };
}

export function countMockResponses(surveyId: string, range: DateRange = LAST_30_DAYS): number {
  return listResponses(surveyId).filter((r) => inRange(r, range)).length;
}

export function getAnsweredOptionIds(surveyId: string): Set<string> {
  const ids = new Set<string>();
  for (const response of listResponses(surveyId)) {
    for (const item of response.items) ids.add(item.answerOptionId);
  }
  return ids;
}
