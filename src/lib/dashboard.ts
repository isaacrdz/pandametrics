// Dashboard data and the public survey link. The current user and organization come from
// src/server/app-context.ts; the surveys and metrics are still in memory until phases 3 and 4.

import { getDateRange, type RangeKey } from "@/lib/date-range";
import { MOCK_NOW, getMockSurveyMetrics } from "@/lib/mock-data";
import { matchesQuery } from "@/lib/surveys/search";
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

export function getDashboardData(
  organizationId: string,
  rangeKey: RangeKey,
  query = "",
): DashboardData {
  const range = getDateRange(rangeKey, MOCK_NOW);
  const surveys = listActiveSurveys(organizationId);

  const cards = surveys
    .filter((survey) => matchesQuery(survey, query))
    .map((survey) => ({
      survey,
      metrics: getMockSurveyMetrics(survey, range),
      publicUrl: getPublicSurveyUrl(survey.code),
    }));

  return {
    activeSurveyCount: surveys.length,
    cards,
  };
}
