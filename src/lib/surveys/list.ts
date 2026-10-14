import "server-only";

import { getPublicSurveyUrl } from "@/lib/dashboard";
import { getDateRange, type RangeKey } from "@/lib/date-range";
import { MOCK_NOW, countMockResponses } from "@/lib/mock-data";
import { getSurveyColorIndex } from "@/lib/surveys/colors";
import { listSurveys as listStoredSurveys } from "@/lib/surveys/service";
import type { SurveyCategory } from "@/types/survey";

// Data for the survey table (/surveys), with the shape of the future GET /api/v1/surveys.
// Phase 2 adds query, categories, status and paging to the params; the result keeps its shape.

export interface SurveyListParams {
  range: RangeKey;
}

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
  // Before filters: tells "no surveys yet" apart from "no results"
  totalAll: number;
  activeCount: number;
  // Reference for relative dates ("Today", "Yesterday"); the mock clock until the database exists
  now: string;
}

export function listSurveys(organizationId: string, params: SurveyListParams): SurveyListResult {
  const range = getDateRange(params.range, MOCK_NOW);
  const surveys = listStoredSurveys(organizationId);

  const rows = surveys
    .toSorted((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime() || a.name.localeCompare(b.name))
    .map((survey) => ({
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
    totalAll: surveys.length,
    activeCount: surveys.filter((survey) => survey.isActive).length,
    now: MOCK_NOW.toISOString(),
  };
}
