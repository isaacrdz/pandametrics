import { describe, expect, it } from "vitest";
import { searchQuerySchema } from "@/lib/search/schema";
import { SEARCH_QUERY_MAX } from "@/lib/search/types";

describe("searchQuerySchema", () => {
  it("trims the query", () => {
    expect(searchQuerySchema.parse("  store7 ")).toBe("store7");
  });

  it("turns a blank query into an empty string (recent surveys)", () => {
    expect(searchQuerySchema.parse("   ")).toBe("");
  });

  it("cuts a long query instead of failing, without splitting characters", () => {
    expect(searchQuerySchema.parse("a".repeat(250))).toHaveLength(SEARCH_QUERY_MAX);
    const emoji = "🐼".repeat(SEARCH_QUERY_MAX + 5);
    expect(Array.from(searchQuerySchema.parse(emoji))).toHaveLength(SEARCH_QUERY_MAX);
  });

  it("rejects absurdly long input and non-strings", () => {
    expect(searchQuerySchema.safeParse("a".repeat(10 * SEARCH_QUERY_MAX + 1)).success).toBe(false);
    expect(searchQuerySchema.safeParse(42).success).toBe(false);
    expect(searchQuerySchema.safeParse(undefined).success).toBe(false);
  });
});
