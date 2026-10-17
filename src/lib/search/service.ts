import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getInitials } from "@/lib/format";
import {
  SEARCH_GROUP_LIMIT,
  type SearchGroup,
  type SearchResults,
  type SurveyHit,
} from "@/lib/search/types";
import { getSurveyColorIndex } from "@/lib/surveys/colors";
import { surveysTag } from "@/lib/surveys/list";
import { usersTag } from "@/lib/users/list";
import { prisma } from "@/server/prisma";
import { containsPattern, digitsPattern, escapeLike } from "@/server/search";
import type { Role, SurveyCategory } from "@/types/survey";

// The command palette's search over one organization: a few surveys and people per query, with
// the same accent- and case-insensitive matching as the /surveys and /users tables (f_unaccent,
// escaped LIKE). Cached with those tables' tags, so every survey or user action that refreshes the
// tables refreshes the palette too.

interface SurveyHitRow {
  id: string;
  name: string;
  code: string;
  category: SurveyCategory;
  isActive: boolean;
  total: number;
}

interface PersonHitRow {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: Role;
  isActive: boolean;
  total: number;
}

function toSurveyGroup(rows: SurveyHitRow[]): SearchGroup<SurveyHit> {
  return {
    hits: rows.map((survey) => ({
      id: survey.id,
      name: survey.name,
      code: survey.code,
      category: survey.category,
      isActive: survey.isActive,
      colorIndex: getSurveyColorIndex(survey.id),
    })),
    total: rows[0]?.total ?? 0,
  };
}

// Exact code first (people type or scan codes), then names starting with the query, then any
// match; the most recently updated first within each
function querySurveys(organizationId: string, query: string): Promise<SurveyHitRow[]> {
  const pattern = containsPattern(query);
  const prefix = `${escapeLike(query.trim())}%`;
  return prisma.$queryRaw<SurveyHitRow[]>`
    SELECT s.id, s.name, s.code, s.category::text AS category, s."isActive", COUNT(*) OVER()::int AS total
    FROM "Survey" s
    WHERE s."organizationId" = ${organizationId} AND s."deletedAt" IS NULL
      AND (
        f_unaccent(lower(s.name)) LIKE f_unaccent(lower(${pattern})) ESCAPE '\\'
        OR lower(s.code) LIKE lower(${pattern}) ESCAPE '\\'
      )
    ORDER BY
      CASE
        WHEN lower(s.code) = lower(${query.trim()}) THEN 0
        WHEN f_unaccent(lower(s.name)) LIKE f_unaccent(lower(${prefix})) ESCAPE '\\' THEN 1
        ELSE 2
      END,
      s."updatedAt" DESC,
      s.name COLLATE "und-x-icu"
    LIMIT ${SEARCH_GROUP_LIMIT}`;
}

// The organization's members (the rows /users lists: public columns only, role and status from the
// membership) by name, email or phone digits. Names starting with the query first; the signed-in
// user last, since they rarely look for themselves
function queryPeople(organizationId: string, currentUserId: string, query: string): Promise<PersonHitRow[]> {
  const pattern = containsPattern(query);
  const prefix = `${escapeLike(query.trim())}%`;
  const digits = digitsPattern(query);
  return prisma.$queryRaw<PersonHitRow[]>`
    SELECT u.id, u.name, u.email, u.image, m.role::text AS role, m."isActive", COUNT(*) OVER()::int AS total
    FROM "Membership" m
    JOIN "User" u ON u.id = m."userId"
    WHERE m."organizationId" = ${organizationId} AND u."deletedAt" IS NULL
      AND (
        f_unaccent(lower(coalesce(u.name, ''))) LIKE f_unaccent(lower(${pattern})) ESCAPE '\\'
        OR lower(coalesce(u.email, '')) LIKE lower(${pattern}) ESCAPE '\\'
        ${digits ? Prisma.sql`OR regexp_replace(coalesce(u.phone, ''), '\\D', '', 'g') LIKE ${digits}` : Prisma.empty}
      )
    ORDER BY
      u.id = ${currentUserId},
      f_unaccent(lower(coalesce(u.name, ''))) LIKE f_unaccent(lower(${prefix})) ESCAPE '\\' DESC,
      u.name COLLATE "und-x-icu",
      u.email
    LIMIT ${SEARCH_GROUP_LIMIT}`;
}

export async function searchOrganization(organizationId: string, currentUserId: string, query: string): Promise<SearchResults> {
  "use cache";
  cacheTag(surveysTag(organizationId), usersTag(organizationId));
  cacheLife("minutes");

  const [surveys, people] = await Promise.all([
    querySurveys(organizationId, query),
    queryPeople(organizationId, currentUserId, query),
  ]);

  return {
    surveys: toSurveyGroup(surveys),
    people: {
      hits: people.map((person) => ({
        id: person.id,
        name: person.name ?? person.email ?? "",
        email: person.email ?? "",
        image: person.image,
        initials: getInitials(person.name),
        role: person.role,
        isActive: person.isActive,
        isCurrentUser: person.id === currentUserId,
        isOwner: person.role === "OWNER",
      })),
      total: people[0]?.total ?? 0,
    },
  };
}

// The palette before anything is typed: the most recently updated surveys
export async function recentSurveys(organizationId: string): Promise<SearchGroup<SurveyHit>> {
  "use cache";
  cacheTag(surveysTag(organizationId));
  cacheLife("minutes");

  const rows = await prisma.$queryRaw<SurveyHitRow[]>`
    SELECT s.id, s.name, s.code, s.category::text AS category, s."isActive", COUNT(*) OVER()::int AS total
    FROM "Survey" s
    WHERE s."organizationId" = ${organizationId} AND s."deletedAt" IS NULL
    ORDER BY s."updatedAt" DESC, s.name COLLATE "und-x-icu"
    LIMIT ${SEARCH_GROUP_LIMIT}`;
  return toSurveyGroup(rows);
}
