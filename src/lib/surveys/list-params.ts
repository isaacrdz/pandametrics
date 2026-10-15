import { DEFAULT_RANGE, parseRange, type RangeKey } from "@/lib/date-range";
import { SURVEY_CATEGORIES } from "@/lib/surveys/constants";
import {
  DEFAULT_PAGE_SIZE,
  firstParam as first,
  parsePage,
  parsePageSize,
  type PageSize,
  type SearchParams,
} from "@/lib/table/pagination";
import type { SurveyCategory } from "@/types/survey";

// URL state of the survey table (/surveys). Shared by the page (parsing) and the client
// components (links), so it stays free of server-only imports.

export const SURVEY_STATUS_FILTERS = ["all", "active", "draft"] as const;

export type SurveyStatusFilter = (typeof SURVEY_STATUS_FILTERS)[number];

export interface SurveyListQuery {
  query: string;
  // Empty means every category
  categories: SurveyCategory[];
  status: SurveyStatusFilter;
  range: RangeKey;
  page: number;
  pageSize: PageSize;
}

export const DEFAULT_SURVEY_LIST_QUERY: SurveyListQuery = {
  query: "",
  categories: [],
  status: "all",
  range: DEFAULT_RANGE,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

export function parseSurveyListParams(searchParams: SearchParams): SurveyListQuery {
  const type = first(searchParams.type) ?? "";
  const requested = new Set(type.toUpperCase().split(","));
  const status = first(searchParams.status);

  return {
    query: (first(searchParams.q) ?? "").trim(),
    // Fixed category order, so ?type=poll,rating and ?type=rating,poll are the same view
    categories: SURVEY_CATEGORIES.filter((category) => requested.has(category)),
    status: SURVEY_STATUS_FILTERS.find((value) => value === status) ?? "all",
    range: parseRange(first(searchParams.range)),
    page: parsePage(searchParams.page),
    pageSize: parsePageSize(searchParams.size),
  };
}

// Only non-default values are written, so the plain /surveys URL is the default view
export function buildSurveysHref(params: SurveyListQuery): string {
  const search = new URLSearchParams();
  if (params.query) search.set("q", params.query);
  if (params.categories.length > 0) {
    search.set("type", params.categories.map((category) => category.toLowerCase()).join(","));
  }
  if (params.status !== "all") search.set("status", params.status);
  if (params.range !== DEFAULT_RANGE) search.set("range", params.range);
  if (params.pageSize !== DEFAULT_PAGE_SIZE) search.set("size", String(params.pageSize));
  if (params.page > 1) search.set("page", String(params.page));
  const queryString = search.toString();
  return queryString ? `/surveys?${queryString}` : "/surveys";
}

// Any filter or page size change starts again at page 1
export function withFilters(params: SurveyListQuery, changes: Partial<Omit<SurveyListQuery, "page">>): SurveyListQuery {
  return { ...params, ...changes, page: 1 };
}
