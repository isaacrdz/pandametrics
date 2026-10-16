// Dashboard data and the public survey link. The surveys come from the database; the metrics are
// still computed from the in-memory responses until phase 4.

import { cacheLife, cacheTag } from "next/cache";
import { getDateRange, type RangeKey } from "@/lib/date-range";
import { MOCK_NOW, getMockSurveyMetrics } from "@/lib/mock-data";
import { surveysTag } from "@/lib/surveys/list";
import { listActiveSurveys } from "@/lib/surveys/service";
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

// Cached by organization, range key and query; survey actions and kiosk answers expire the tag.
// The search runs in SQL (accents and case ignored), the active count is always unfiltered
export async function getDashboardData(
  organizationId: string,
  rangeKey: RangeKey,
  query = "",
): Promise<DashboardData> {
  "use cache";
  cacheTag(surveysTag(organizationId));
  cacheLife("hours");

  const range = getDateRange(rangeKey, MOCK_NOW);
  const trimmed = query.trim();
  const [active, matching] = await Promise.all([
    listActiveSurveys(organizationId),
    trimmed ? listActiveSurveys(organizationId, trimmed) : null,
  ]);

  const cards = (matching ?? active).map((survey) => ({
    survey,
    metrics: getMockSurveyMetrics(survey, range),
    publicUrl: getPublicSurveyUrl(survey.code),
  }));

  return {
    activeSurveyCount: active.length,
    cards,
  };
}
