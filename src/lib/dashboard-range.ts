import type { DateRange } from "@/types/survey";

// The dashboard's date filter: calendar presets plus a custom span of days. Kept in the URL
// (`?range=last-month`, or `?range=custom&from=2026-10-01&to=2026-10-12`) so a view can be shared.
// The surveys table keeps its own rolling ranges (src/lib/date-range.ts). Labels live in the
// messages under dashboard.range.<key>.

export const DASHBOARD_RANGE_KEYS = ["today", "yesterday", "this-month", "last-month", "this-year", "last-year", "custom"] as const;

export type DashboardRangeKey = (typeof DASHBOARD_RANGE_KEYS)[number];
export type DashboardPresetKey = Exclude<DashboardRangeKey, "custom">;

// Plain data (it is part of the dashboard's cache key). Custom days are YYYY-MM-DD, both included
export type DashboardRange = { key: DashboardPresetKey } | { key: "custom"; from: string; to: string };

export const DEFAULT_DASHBOARD_RANGE: DashboardRange = { key: "this-month" };

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

// A real calendar day in YYYY-MM-DD ("2026-02-30" is not one)
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return toIsoDate(date) === value;
}

// The UTC calendar day of a date, as YYYY-MM-DD
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Midnight UTC of a YYYY-MM-DD day
export function fromIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Anything unknown or malformed falls back to the default; a custom span needs two real days in order
export function parseDashboardRange(params: Record<string, string | string[] | undefined>): DashboardRange {
  const key = first(params.range);
  if (key === "custom") {
    const from = first(params.from);
    const to = first(params.to);
    return isIsoDate(from) && isIsoDate(to) && from <= to ? { key, from, to } : DEFAULT_DASHBOARD_RANGE;
  }
  const preset = DASHBOARD_RANGE_KEYS.find((candidate) => candidate === key && candidate !== "custom");
  return preset ? { key: preset as DashboardPresetKey } : DEFAULT_DASHBOARD_RANGE;
}

// The dashboard URL for a range (no params for the default)
export function dashboardRangeHref(pathname: string, range: DashboardRange): string {
  if (range.key === DEFAULT_DASHBOARD_RANGE.key) return pathname;
  const params = new URLSearchParams({ range: range.key });
  if (range.key === "custom") {
    params.set("from", range.from);
    params.set("to", range.to);
  }
  return `${pathname}?${params}`;
}

function utcDay(year: number, month: number, day = 1): Date {
  return new Date(Date.UTC(year, month, day));
}

// [from, to) in UTC, like the rest of the metrics for now. "This month" and "this year" run until
// the end of today; a custom span includes its last day
export function getDashboardDateRange(range: DashboardRange, now: Date): DateRange {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const today = utcDay(year, month, now.getUTCDate());
  const tomorrow = new Date(today.getTime() + DAY_MS);

  switch (range.key) {
    case "today":
      return { from: today, to: tomorrow };
    case "yesterday":
      return { from: new Date(today.getTime() - DAY_MS), to: today };
    case "this-month":
      return { from: utcDay(year, month), to: tomorrow };
    case "last-month":
      return { from: utcDay(year, month - 1), to: utcDay(year, month) };
    case "this-year":
      return { from: utcDay(year, 0), to: tomorrow };
    case "last-year":
      return { from: utcDay(year - 1, 0), to: utcDay(year, 0) };
    case "custom":
      return { from: fromIsoDate(range.from), to: new Date(fromIsoDate(range.to).getTime() + DAY_MS) };
  }
}

// The days a range covers as YYYY-MM-DD, last day included (to prefill the custom picker)
export function dashboardRangeDays(range: DashboardRange, now: Date): { from: string; to: string } {
  const { from, to } = getDashboardDateRange(range, now);
  return { from: toIsoDate(from), to: toIsoDate(new Date(to.getTime() - DAY_MS)) };
}
