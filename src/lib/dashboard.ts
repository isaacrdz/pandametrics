// Dashboard data and the public survey link. Surveys and metrics come from the database.

import { cacheLife, cacheTag } from "next/cache";
import { getDashboardDateRange, type DashboardRange } from "@/lib/dashboard-range";
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

// Cached by organization and range (its key, plus the days of a custom span); survey actions and
// kiosk answers expire the tags. The dates are computed here with the real now, so the cache key
// stays stable and "hours" keeps "today" from drifting far
export async function getDashboardData(organizationId: string, dashboardRange: DashboardRange): Promise<DashboardData> {
  "use cache";
  cacheTag(surveysTag(organizationId));
  cacheLife("hours");

  const range = getDashboardDateRange(dashboardRange, new Date());
  const surveys = await listActiveSurveys(organizationId);
  for (const survey of surveys) cacheTag(surveyTag(survey.id));
  const metrics = await getOrganizationMetrics(organizationId, surveys, range);

  const cards = surveys.map((survey) => ({
    survey,
    metrics: metrics.get(survey.id)!,
    publicUrl: getPublicSurveyUrl(survey.code),
  }));

  return {
    activeSurveyCount: surveys.length,
    cards,
  };
}
