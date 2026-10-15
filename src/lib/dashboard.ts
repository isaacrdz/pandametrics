// Single data access point for the dashboard. Backed by the mock until Prisma exists.

import { getDateRange, type RangeKey } from "@/lib/date-range";
import {
  MOCK_CURRENT_ORGANIZATION,
  MOCK_CURRENT_USER,
  MOCK_NOW,
  MOCK_ORGANIZATIONS,
  getMockSurveyMetrics,
} from "@/lib/mock-data";
import { matchesQuery } from "@/lib/surveys/search";
import { listActiveSurveys } from "@/lib/surveys/service";
import { getUserById } from "@/lib/users/service";
import type {
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
  activeSurveyCount: number;
  cards: SurveyCardData[];
}

export function getAppContext(): AppContext {
  return {
    // Mock session: the signed-in user comes from the user store, so profile edits show up
    // in the sidebar and the greeting
    user: getUserById(MOCK_CURRENT_USER.id) ?? MOCK_CURRENT_USER,
    organization: MOCK_CURRENT_ORGANIZATION,
    organizations: MOCK_ORGANIZATIONS,
  };
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
