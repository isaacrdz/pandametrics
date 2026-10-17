import { describe, expect, it } from "vitest";
import {
  DEFAULT_DASHBOARD_RANGE,
  dashboardRangeDays,
  dashboardRangeHref,
  getDashboardDateRange,
  isIsoDate,
  parseDashboardRange,
  type DashboardRange,
} from "@/lib/dashboard-range";

const NOW = new Date("2026-03-15T18:30:00Z");

function span(range: DashboardRange) {
  const { from, to } = getDashboardDateRange(range, NOW);
  return [from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)];
}

describe("getDashboardDateRange", () => {
  it("covers today and yesterday as single days", () => {
    expect(span({ key: "today" })).toEqual(["2026-03-15", "2026-03-16"]);
    expect(span({ key: "yesterday" })).toEqual(["2026-03-14", "2026-03-15"]);
  });

  it("runs this month and this year until the end of today", () => {
    expect(span({ key: "this-month" })).toEqual(["2026-03-01", "2026-03-16"]);
    expect(span({ key: "this-year" })).toEqual(["2026-01-01", "2026-03-16"]);
  });

  it("covers the whole previous month and year", () => {
    expect(span({ key: "last-month" })).toEqual(["2026-02-01", "2026-03-01"]);
    expect(span({ key: "last-year" })).toEqual(["2025-01-01", "2026-01-01"]);
  });

  it("wraps to December for last month in January", () => {
    const { from, to } = getDashboardDateRange({ key: "last-month" }, new Date("2026-01-10T00:00:00Z"));
    expect([from.toISOString(), to.toISOString()]).toEqual(["2025-12-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z"]);
  });

  it("includes the last day of a custom span", () => {
    expect(span({ key: "custom", from: "2026-02-10", to: "2026-02-12" })).toEqual(["2026-02-10", "2026-02-13"]);
  });
});

describe("parseDashboardRange", () => {
  it("reads presets and defaults to this month", () => {
    expect(parseDashboardRange({ range: "last-year" })).toEqual({ key: "last-year" });
    expect(parseDashboardRange({})).toEqual(DEFAULT_DASHBOARD_RANGE);
    expect(parseDashboardRange({ range: "30d" })).toEqual(DEFAULT_DASHBOARD_RANGE);
  });

  it("reads a custom span of real days in order", () => {
    expect(parseDashboardRange({ range: "custom", from: "2026-02-01", to: "2026-02-28" })).toEqual({
      key: "custom",
      from: "2026-02-01",
      to: "2026-02-28",
    });
    expect(parseDashboardRange({ range: "custom", from: "2026-03-01", to: "2026-03-01" }).key).toBe("custom");
  });

  it("falls back for a bad custom span", () => {
    expect(parseDashboardRange({ range: "custom", from: "2026-03-02", to: "2026-03-01" })).toEqual(DEFAULT_DASHBOARD_RANGE);
    expect(parseDashboardRange({ range: "custom", from: "2026-02-30", to: "2026-03-01" })).toEqual(DEFAULT_DASHBOARD_RANGE);
    expect(parseDashboardRange({ range: "custom", from: "2026-02-01" })).toEqual(DEFAULT_DASHBOARD_RANGE);
  });

  it("uses the first value of repeated params", () => {
    expect(parseDashboardRange({ range: ["today", "last-year"] })).toEqual({ key: "today" });
  });
});

describe("helpers", () => {
  it("validates calendar days", () => {
    expect(isIsoDate("2024-02-29")).toBe(true);
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2026-3-01")).toBe(false);
    expect(isIsoDate(20260301)).toBe(false);
  });

  it("builds the dashboard URL, without params for the default", () => {
    expect(dashboardRangeHref("/dashboard", { key: "this-month" })).toBe("/dashboard");
    expect(dashboardRangeHref("/dashboard", { key: "yesterday" })).toBe("/dashboard?range=yesterday");
    expect(dashboardRangeHref("/dashboard", { key: "custom", from: "2026-02-01", to: "2026-02-03" })).toBe(
      "/dashboard?range=custom&from=2026-02-01&to=2026-02-03",
    );
  });

  it("lists the days a range covers, last day included", () => {
    expect(dashboardRangeDays({ key: "this-month" }, NOW)).toEqual({ from: "2026-03-01", to: "2026-03-15" });
    expect(dashboardRangeDays({ key: "last-month" }, NOW)).toEqual({ from: "2026-02-01", to: "2026-02-28" });
  });
});
