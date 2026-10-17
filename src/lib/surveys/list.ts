import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getPublicSurveyUrl } from "@/lib/dashboard";
import { getDateRange } from "@/lib/date-range";
import { getSurveyColorIndex } from "@/lib/surveys/colors";
import type { SurveyListQuery } from "@/lib/surveys/list-params";
import { prisma } from "@/server/prisma";
import { containsPattern } from "@/server/search";
import type { SurveyCategory } from "@/types/survey";

// Data for the survey table (/surveys), with the shape of the future GET /api/v1/surveys. Search,
// filters, sort, paging and the response counts run in Postgres; the client only renders the rows.

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
  // Reference for relative dates ("Today", "Yesterday")
  now: string;
}

// Tag of every cached read of an organization's surveys (list, counts, dashboard); survey actions
// and kiosk answers expire it with updateTag
export function surveysTag(organizationId: string): string {
  return `org:${organizationId}:surveys`;
}

// Tag of one survey's cached reads (the edit form)
export function surveyTag(surveyId: string): string {
  return `survey:${surveyId}`;
}

interface SurveyListRow {
  id: string;
  code: string;
  name: string;
  category: SurveyCategory;
  isActive: boolean;
  updatedAt: Date;
  responses: number;
  total: number;
}

// Name or code, ignoring accents and case (f_unaccent); LIKE wildcards in the query are escaped
function searchCondition(query: string): Prisma.Sql {
  if (!query) return Prisma.empty;
  const pattern = containsPattern(query);
  return Prisma.sql`AND (
    f_unaccent(lower(s.name)) LIKE f_unaccent(lower(${pattern})) ESCAPE '\\'
    OR lower(s.code) LIKE lower(${pattern}) ESCAPE '\\'
  )`;
}

function filterConditions(params: SurveyListQuery): Prisma.Sql {
  const categories =
    params.categories.length > 0
      ? Prisma.sql`AND s.category::text IN (${Prisma.join(params.categories)})`
      : Prisma.empty;
  const status = params.status === "all" ? Prisma.empty : Prisma.sql`AND s."isActive" = ${params.status === "active"}`;
  return Prisma.sql`${categories} ${status}`;
}

// One page of the organization's surveys with their responses in the range and the filtered
// total from COUNT(*) OVER()
async function queryPage(organizationId: string, params: SurveyListQuery, page: number, from: Date, to: Date) {
  return prisma.$queryRaw<SurveyListRow[]>`
    SELECT s.id, s.code, s.name, s.category::text AS category, s."isActive", s."updatedAt",
           coalesce(r.responses, 0)::int AS responses,
           COUNT(*) OVER()::int AS total
    FROM "Survey" s
    LEFT JOIN (
      SELECT "surveyId", COUNT(*) AS responses
      FROM "SurveyResponse"
      WHERE "organizationId" = ${organizationId} AND "createdAt" >= ${from} AND "createdAt" < ${to}
      GROUP BY "surveyId"
    ) r ON r."surveyId" = s.id
    WHERE s."organizationId" = ${organizationId} AND s."deletedAt" IS NULL
      ${searchCondition(params.query)}
      ${filterConditions(params)}
    ORDER BY s."updatedAt" DESC, s.name COLLATE "und-x-icu"
    LIMIT ${params.pageSize} OFFSET ${(page - 1) * params.pageSize}`;
}

// Active and total counts of the organization's surveys (the table's totals and the active-limit hints)
async function countSurveys(organizationId: string) {
  const groups = await prisma.survey.groupBy({
    by: ["isActive"],
    where: { organizationId, deletedAt: null },
    _count: { _all: true },
  });
  const count = (isActive: boolean) => groups.find((group) => group.isActive === isActive)?._count._all ?? 0;
  return { total: count(true) + count(false), active: count(true) };
}

export async function listSurveys(organizationId: string, params: SurveyListQuery): Promise<SurveyListResult> {
  "use cache";
  cacheTag(surveysTag(organizationId));
  // The range is computed here from its key, so the cache key stays stable; "hours" keeps
  // "last 7 days" from drifting while writes expire the tag right away
  cacheLife("hours");

  const now = new Date();
  const { from, to } = getDateRange(params.range, now);

  let page = Math.max(1, params.page);
  let rows = await queryPage(organizationId, params, page, from, to);
  let total = rows[0]?.total ?? 0;

  // Past the last page: show the last page instead
  if (rows.length === 0 && page > 1) {
    const [firstRow] = await queryPage(organizationId, params, 1, from, to);
    total = firstRow?.total ?? 0;
    page = Math.max(1, Math.ceil(total / params.pageSize));
    rows = await queryPage(organizationId, params, page, from, to);
  }

  const counts = await countSurveys(organizationId);

  return {
    rows: rows.map((survey) => ({
      id: survey.id,
      code: survey.code,
      name: survey.name,
      category: survey.category,
      isActive: survey.isActive,
      responses: survey.responses,
      updatedAt: survey.updatedAt.toISOString(),
      publicUrl: getPublicSurveyUrl(survey.code),
      colorIndex: getSurveyColorIndex(survey.id),
    })),
    total,
    totalAll: counts.total,
    page,
    pageCount: Math.max(1, Math.ceil(total / params.pageSize)),
    pageSize: params.pageSize,
    activeCount: counts.active,
    now: now.toISOString(),
  };
}
