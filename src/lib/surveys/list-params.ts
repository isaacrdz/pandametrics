import { DEFAULT_RANGE, parseRange, type RangeKey } from "@/lib/date-range";
import { SURVEY_CATEGORIES } from "@/lib/surveys/constants";
import type { SurveyCategory } from "@/types/survey";

// URL state of the survey table (/surveys). Shared by the page (parsing) and the client
// components (links), so it stays free of server-only imports.

export const SURVEY_STATUS_FILTERS = ["all", "active", "draft"] as const;

export type SurveyStatusFilter = (typeof SURVEY_STATUS_FILTERS)[number];

export const SURVEYS_PAGE_SIZE = 10;

export interface SurveyListQuery {
  query: string;
  // Empty means every category
  categories: SurveyCategory[];
  status: SurveyStatusFilter;
  range: RangeKey;
  page: number;
}

export const DEFAULT_SURVEY_LIST_QUERY: SurveyListQuery = {
  query: "",
  categories: [],
  status: "all",
  range: DEFAULT_RANGE,
  page: 1,
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseSurveyListParams(searchParams: SearchParams): SurveyListQuery {
  const type = first(searchParams.type) ?? "";
  const requested = new Set(type.toUpperCase().split(","));
  const status = first(searchParams.status);
  const page = Number.parseInt(first(searchParams.page) ?? "", 10);

  return {
    query: (first(searchParams.q) ?? "").trim(),
    // Fixed category order, so ?type=poll,rating and ?type=rating,poll are the same view
    categories: SURVEY_CATEGORIES.filter((category) => requested.has(category)),
    status: SURVEY_STATUS_FILTERS.find((value) => value === status) ?? "all",
    range: parseRange(first(searchParams.range)),
    page: Number.isFinite(page) && page > 1 ? page : 1,
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
  if (params.page > 1) search.set("page", String(params.page));
  const queryString = search.toString();
  return queryString ? `/surveys?${queryString}` : "/surveys";
}

// Any filter change starts again at page 1
export function withFilters(params: SurveyListQuery, changes: Partial<Omit<SurveyListQuery, "page">>): SurveyListQuery {
  return { ...params, ...changes, page: 1 };
}

export type PageItem = number | "ellipsis-start" | "ellipsis-end";

// Every page up to 7; beyond that the first, the last and the current one with its neighbors
export function getPageItems(page: number, pageCount: number): PageItem[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);

  const start = Math.max(2, Math.min(page - 1, pageCount - 4));
  const end = Math.min(pageCount - 1, Math.max(page + 1, 5));
  const items: PageItem[] = [1];
  if (start > 2) items.push("ellipsis-start");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < pageCount - 1) items.push("ellipsis-end");
  items.push(pageCount);
  return items;
}
