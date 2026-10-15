// Pagination shared by every list page (surveys, users). Free of server-only imports, so the
// pages (parsing) and the client components (links, pager) can both use it.

// Rows per page offered under a table; the first one is the default
export const PAGE_SIZE_OPTIONS = [5, 10, 25, 50] as const;

export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export const DEFAULT_PAGE_SIZE: PageSize = PAGE_SIZE_OPTIONS[0];

// The largest page, and so the largest selection a bulk action can receive
export const MAX_PAGE_SIZE: PageSize = PAGE_SIZE_OPTIONS[PAGE_SIZE_OPTIONS.length - 1];

export type SearchParams = Record<string, string | string[] | undefined>;

export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parsePage(value: string | string[] | undefined): number {
  const page = Number.parseInt(firstParam(value) ?? "", 10);
  return Number.isFinite(page) && page > 1 ? page : 1;
}

export function parsePageSize(value: string | string[] | undefined): PageSize {
  const size = Number(firstParam(value));
  return PAGE_SIZE_OPTIONS.find((option) => option === size) ?? DEFAULT_PAGE_SIZE;
}

// Clamps a requested page to [1, pageCount] and slices the rows of that page
export function paginate<T>(items: T[], requestedPage: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  return { page, pageCount, items: items.slice((page - 1) * pageSize, page * pageSize) };
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
