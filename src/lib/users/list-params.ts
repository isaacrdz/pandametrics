import {
  DEFAULT_PAGE_SIZE,
  firstParam,
  parsePage,
  parsePageSize,
  type PageSize,
  type SearchParams,
} from "@/lib/table/pagination";

// URL state of the user list (/users). Shared by the page (parsing) and the client components
// (links), so it stays free of server-only imports.

export const USER_STATUS_FILTERS = ["all", "active", "inactive"] as const;

export type UserStatusFilter = (typeof USER_STATUS_FILTERS)[number];

export interface UserListQuery {
  query: string;
  status: UserStatusFilter;
  page: number;
  pageSize: PageSize;
}

export const DEFAULT_USER_LIST_QUERY: UserListQuery = {
  query: "",
  status: "all",
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

export function parseUserListParams(searchParams: SearchParams): UserListQuery {
  const status = firstParam(searchParams.status);

  return {
    query: (firstParam(searchParams.q) ?? "").trim(),
    status: USER_STATUS_FILTERS.find((value) => value === status) ?? "all",
    page: parsePage(searchParams.page),
    pageSize: parsePageSize(searchParams.size),
  };
}

// Only non-default values are written, so the plain /users URL is the default view
export function buildUsersHref(params: UserListQuery): string {
  const search = new URLSearchParams();
  if (params.query) search.set("q", params.query);
  if (params.status !== "all") search.set("status", params.status);
  if (params.pageSize !== DEFAULT_PAGE_SIZE) search.set("size", String(params.pageSize));
  if (params.page > 1) search.set("page", String(params.page));
  const queryString = search.toString();
  return queryString ? `/users?${queryString}` : "/users";
}

// Any filter or page size change starts again at page 1
export function withUserFilters(params: UserListQuery, changes: Partial<Omit<UserListQuery, "page">>): UserListQuery {
  return { ...params, ...changes, page: 1 };
}
