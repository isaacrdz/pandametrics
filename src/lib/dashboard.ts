// Dashboard data and the public survey link. Surveys and metrics come from the database.

import { cacheLife, cacheTag } from "next/cache";
import { getDateRange, type RangeKey } from "@/lib/date-range";
import { surveysTag, surveyTag } from "@/lib/surveys/list";
import { listActiveSurveys } from "@/lib/surveys/service";
import { getOrganizationMetrics } from "@/server/metrics";
import type { Survey, SurveyMetrics } from "@/types/survey";

export interface SurveyCardData {
  survey: Survey;
  metrics: SurveyMetrics;
  publicUrl: string;
}

export interface DashboardData {
  activeSurveyCount: number;
  cards: SurveyCardData[];
}

export function getPublicSurveyUrl(code: string): string {
  const baseUrl = process.env.PANDA_PUBLIC_URL ?? "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/s?code=${code}`;
}

// Cached by organization, range key and query; survey actions and kiosk answers expire the tags.
// The range is computed here from its key with the real now, so the cache key stays stable and
// "hours" keeps "last 7 days" from drifting. The search runs in SQL (accents and case ignored), the
// active count is always unfiltered
export async function getDashboardData(
  organizationId: string,
  rangeKey: RangeKey,
  query = "",
): Promise<DashboardData> {
  "use cache";
  cacheTag(surveysTag(organizationId));
  cacheLife("hours");

  const range = getDateRange(rangeKey, new Date());
  const trimmed = query.trim();
  const [active, matching] = await Promise.all([
    listActiveSurveys(organizationId),
    trimmed ? listActiveSurveys(organizationId, trimmed) : null,
  ]);

  const surveys = matching ?? active;
  for (const survey of surveys) cacheTag(surveyTag(survey.id));
  const metrics = await getOrganizationMetrics(organizationId, surveys, range);

  const cards = surveys.map((survey) => ({
    survey,
    metrics: metrics.get(survey.id)!,
    publicUrl: getPublicSurveyUrl(survey.code),
  }));

  return {
    activeSurveyCount: active.length,
    cards,
  };
}
