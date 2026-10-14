import type { DateRange } from "@/types/survey";

// Labels live in the messages under dateRange.<key>
export const RANGE_KEYS = ["7d", "30d", "90d", "month"] as const;

export type RangeKey = (typeof RANGE_KEYS)[number];

export const DEFAULT_RANGE: RangeKey = "30d";

const DAY_MS = 24 * 60 * 60 * 1000;

const RANGE_DAYS: Record<Exclude<RangeKey, "month">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export function parseRange(value: string | string[] | undefined): RangeKey {
  return RANGE_KEYS.find((key) => key === value) ?? DEFAULT_RANGE;
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
