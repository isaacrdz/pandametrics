import type { DateRange } from "@/types/survey";

export type RangeKey = "7d" | "30d" | "90d" | "month";

export const DEFAULT_RANGE: RangeKey = "30d";

export const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "90d", label: "Últimos 90 días" },
  { value: "month", label: "Este mes" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

const RANGE_DAYS: Record<Exclude<RangeKey, "month">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export function parseRange(value: string | string[] | undefined): RangeKey {
  const option = RANGE_OPTIONS.find((o) => o.value === value);
  return option ? option.value : DEFAULT_RANGE;
}

export function getRangeLabel(key: RangeKey): string {
  return RANGE_OPTIONS.find((o) => o.value === key)?.label ?? "";
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// Ranges are calculated in UTC for now; the metrics engine will use the user's timezone
export function getDateRange(key: RangeKey, now: Date): DateRange {
  const to = new Date(startOfDay(now).getTime() + DAY_MS);

  if (key === "month") {
    return { from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), to };
  }
  return { from: new Date(to.getTime() - RANGE_DAYS[key] * DAY_MS), to };
}

export function getTodayRange(now: Date): DateRange {
  const from = startOfDay(now);
  return { from, to: new Date(from.getTime() + DAY_MS) };
}
