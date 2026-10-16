import "server-only";

import { cacheTag } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getInitials } from "@/lib/format";
import type { UserListQuery } from "@/lib/users/list-params";
import { prisma } from "@/server/prisma";
import { containsPattern, digitsPattern } from "@/server/search";
import type { Role } from "@/types/survey";

// Data for the user list (/users), with the shape of the future GET /api/v1/users. Search, filter,
// sort and paging run in Postgres; the client only renders the rows.

// Plain data: exactly what the client renders. No Date objects and never the password hash.
export interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
  initials: string;
  role: Role;
  isActive: boolean;
  isCurrentUser: boolean;
  updatedAt: string;
}

export interface UserListResult {
  rows: UserRow[];
  // After filters
  total: number;
  // Before filters
  totalAll: number;
  // Clamped to [1, pageCount]
  page: number;
  pageCount: number;
  pageSize: number;
  // Reference for relative dates ("Today", "Yesterday")
  now: string;
}

interface UserListRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  image: string | null;
  role: Role;
  isActive: boolean;
  updatedAt: Date;
  total: number;
}

// Tag of every cached read of an organization's users; user actions expire it with updateTag
export function usersTag(organizationId: string): string {
  return `org:${organizationId}:users`;
}

// Name, email or phone, ignoring accents and case (f_unaccent, migration search_unaccent); phones
// match on digits only. LIKE wildcards in the query are escaped, so "%" matches literally
function searchCondition(query: string): Prisma.Sql {
  if (!query) return Prisma.empty;
  const pattern = containsPattern(query);
  const digits = digitsPattern(query);
  return Prisma.sql`AND (
    f_unaccent(lower(coalesce(name, ''))) LIKE f_unaccent(lower(${pattern})) ESCAPE '\\'
    OR lower(coalesce(email, '')) LIKE lower(${pattern}) ESCAPE '\\'
    ${digits ? Prisma.sql`OR regexp_replace(coalesce(phone, ''), '\\D', '', 'g') LIKE ${digits}` : Prisma.empty}
  )`;
}

function statusCondition(status: UserListQuery["status"]): Prisma.Sql {
  return status === "all" ? Prisma.empty : Prisma.sql`AND "isActive" = ${status === "active"}`;
}

// One page of the organization's users (public columns only, never passwordHash) with the
// filtered total from COUNT(*) OVER()
async function queryPage(organizationId: string, params: UserListQuery, page: number): Promise<UserListRow[]> {
  return prisma.$queryRaw<UserListRow[]>`
    SELECT id, name, email, phone, image, role::text AS role, "isActive", "updatedAt",
           COUNT(*) OVER()::int AS total
    FROM "User"
    WHERE "organizationId" = ${organizationId} AND "deletedAt" IS NULL
      ${searchCondition(params.query)}
      ${statusCondition(params.status)}
    ORDER BY name COLLATE "und-x-icu", email
    LIMIT ${params.pageSize} OFFSET ${(page - 1) * params.pageSize}`;
}

// Count of the organization's users, for the top bar (part of the static shell)
export async function countListedUsers(organizationId: string): Promise<number> {
  "use cache";
  cacheTag(usersTag(organizationId));
  return prisma.user.count({ where: { organizationId, deletedAt: null } });
}

export async function listUsers(organizationId: string, currentUserId: string, params: UserListQuery): Promise<UserListResult> {
  "use cache";
  cacheTag(usersTag(organizationId));

  const requestedPage = Math.max(1, params.page);
  let page = requestedPage;
  let rows = await queryPage(organizationId, params, page);
  let total = rows[0]?.total ?? 0;

  // Past the last page (or an empty page with matches before it): show the last page instead
  if (rows.length === 0 && page > 1) {
    const [firstRow] = await queryPage(organizationId, params, 1);
    total = firstRow?.total ?? 0;
    page = Math.max(1, Math.ceil(total / params.pageSize));
    rows = await queryPage(organizationId, params, page);
  }

  const totalAll = await prisma.user.count({ where: { organizationId, deletedAt: null } });

  return {
    rows: rows.map((user) => ({
      id: user.id,
      name: user.name ?? user.email ?? "",
      email: user.email ?? "",
      phone: user.phone,
      image: user.image,
      initials: getInitials(user.name),
      role: user.role,
      isActive: user.isActive,
      isCurrentUser: user.id === currentUserId,
      updatedAt: user.updatedAt.toISOString(),
    })),
    total,
    totalAll,
    page,
    pageCount: Math.max(1, Math.ceil(total / params.pageSize)),
    pageSize: params.pageSize,
    now: new Date().toISOString(),
  };
}
