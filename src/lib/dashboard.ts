// Single data access point for the dashboard. Backed by the mock until Prisma exists.

import { getDateRange, getTodayRange, type RangeKey } from "@/lib/date-range";
import { normalizeSearch } from "@/lib/format";
import {
  MOCK_CURRENT_ORGANIZATION,
  MOCK_CURRENT_USER,
  MOCK_NOW,
  MOCK_ORGANIZATIONS,
  getMockActiveSurveys,
  getMockDashboardSummary,
  getMockSurveyMetrics,
} from "@/lib/mock-data";
import type {
  DashboardSummary,
  Organization,
  Survey,
  SurveyMetrics,
  User,
} from "@/types/survey";

export interface AppContext {
  user: User;
  organization: Organization;
  organizations: Organization[];
}

export interface SurveyCardData {
  survey: Survey;
  metrics: SurveyMetrics;
  publicUrl: string;
}

export interface DashboardData {
  summary: DashboardSummary;
  todayResponses: number;
  activeSurveyCount: number;
  cards: SurveyCardData[];
}

export function getAppContext(): AppContext {
  return {
    user: MOCK_CURRENT_USER,
    organization: MOCK_CURRENT_ORGANIZATION,
    organizations: MOCK_ORGANIZATIONS,
  };
}

export function getPublicSurveyUrl(code: string): string {
  const baseUrl = process.env.PANDA_PUBLIC_URL ?? "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/s?code=${code}`;
}

function matchesQuery(survey: Survey, query: string): boolean {
  if (!query) return true;
  const normalized = normalizeSearch(query);
  return (
    normalizeSearch(survey.name).includes(normalized) ||
    normalizeSearch(survey.code).includes(normalized)
  );
}

export function getDashboardData(
  organizationId: string,
  rangeKey: RangeKey,
  query = "",
): DashboardData {
  const range = getDateRange(rangeKey, MOCK_NOW);
  const surveys = getMockActiveSurveys(organizationId);

  const cards = surveys
    .filter((survey) => matchesQuery(survey, query))
    .flatMap((survey) => {
      const metrics = getMockSurveyMetrics(survey.id, range);
      return metrics ? [{ survey, metrics, publicUrl: getPublicSurveyUrl(survey.code) }] : [];
    });

  return {
    summary: getMockDashboardSummary(organizationId, range),
    todayResponses: getMockDashboardSummary(organizationId, getTodayRange(MOCK_NOW)).totalResponses,
    activeSurveyCount: surveys.length,
    cards,
  };
}
