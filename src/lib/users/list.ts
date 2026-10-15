import "server-only";

import { getInitials, normalizeSearch } from "@/lib/format";
import { MOCK_NOW } from "@/lib/mock-data";
import { paginate } from "@/lib/table/pagination";
import type { UserListQuery } from "@/lib/users/list-params";
import { listUsers as listStoredUsers } from "@/lib/users/service";
import type { Role, User } from "@/types/survey";

// Data for the user list (/users), with the shape of the future GET /api/v1/users:
// filters, sort and paging happen here, the client only renders the rows.

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
  // Reference for relative dates ("Today", "Yesterday"); the mock clock until the database exists
  now: string;
}

// Name, email or phone, ignoring accents and case; phones also match without spaces or symbols
function matchesUserQuery(user: User, query: string): boolean {
  if (!query) return true;
  const normalized = normalizeSearch(query);
  const digits = query.replace(/\D/g, "");
  return (
    normalizeSearch(user.name ?? "").includes(normalized) ||
    normalizeSearch(user.email ?? "").includes(normalized) ||
    (digits.length > 0 && (user.phone ?? "").replace(/\D/g, "").includes(digits))
  );
}

export function listUsers(organizationId: string, currentUserId: string, params: UserListQuery): UserListResult {
  const users = listStoredUsers(organizationId);

  const filtered = users
    .filter((user) => matchesUserQuery(user, params.query))
    .filter((user) => params.status === "all" || user.isActive === (params.status === "active"))
    .toSorted((a, b) => (a.name ?? "").localeCompare(b.name ?? "") || (a.email ?? "").localeCompare(b.email ?? ""));

  const { page, pageCount, items } = paginate(filtered, params.page, params.pageSize);

  const rows = items.map((user) => ({
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
  }));

  return {
    rows,
    total: filtered.length,
    totalAll: users.length,
    page,
    pageCount,
    pageSize: params.pageSize,
    now: MOCK_NOW.toISOString(),
  };
}
