import "server-only";

import { getPublicSurveyUrl } from "@/lib/dashboard";
import { getDateRange } from "@/lib/date-range";
import { MOCK_NOW, countMockResponses } from "@/lib/mock-data";
import { getSurveyColorIndex } from "@/lib/surveys/colors";
import type { SurveyListQuery } from "@/lib/surveys/list-params";
import { matchesQuery } from "@/lib/surveys/search";
import { listSurveys as listStoredSurveys } from "@/lib/surveys/service";
import { paginate } from "@/lib/table/pagination";
import type { SurveyCategory } from "@/types/survey";

// Data for the survey table (/surveys), with the shape of the future GET /api/v1/surveys:
// filters, sort and paging happen here, the client only renders the rows.

// Plain data: exactly what the client renders, no Date objects and no questions
export interface SurveyRow {
  id: string;
  code: string;
  name: string;
  category: SurveyCategory;
  isActive: boolean;
  // Responses within the selected range
  responses: number;
  updatedAt: string;
  publicUrl: string;
  colorIndex: number;
}

export interface SurveyListResult {
  rows: SurveyRow[];
  // After filters
  total: number;
  // Before filters: tells "no surveys yet" apart from "no results"
  totalAll: number;
  // Clamped to [1, pageCount]
  page: number;
  pageCount: number;
  pageSize: number;
  activeCount: number;
  // Reference for relative dates ("Today", "Yesterday"); the mock clock until the database exists
  now: string;
}

export function listSurveys(organizationId: string, params: SurveyListQuery): SurveyListResult {
  const { pageSize } = params;
  const range = getDateRange(params.range, MOCK_NOW);
  const surveys = listStoredSurveys(organizationId);
  const categories = new Set(params.categories);

  const filtered = surveys
    .filter((survey) => matchesQuery(survey, params.query))
    .filter((survey) => categories.size === 0 || categories.has(survey.category))
    .filter((survey) => params.status === "all" || survey.isActive === (params.status === "active"))
    .toSorted((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime() || a.name.localeCompare(b.name));

  const { page, pageCount, items } = paginate(filtered, params.page, pageSize);

  const rows = items.map((survey) => ({
    id: survey.id,
    code: survey.code,
    name: survey.name,
    category: survey.category,
    isActive: survey.isActive,
    responses: countMockResponses(survey.id, range),
    updatedAt: survey.updatedAt.toISOString(),
    publicUrl: getPublicSurveyUrl(survey.code),
    colorIndex: getSurveyColorIndex(survey.id),
  }));

  return {
    rows,
    total: filtered.length,
    totalAll: surveys.length,
    page,
    pageCount,
    pageSize,
    activeCount: surveys.filter((survey) => survey.isActive).length,
    now: MOCK_NOW.toISOString(),
  };
}
