import { describe, expect, it } from "vitest";
import { containsPattern, digitsPattern, escapeLike } from "@/server/search";

describe("escapeLike / containsPattern", () => {
  it("escapes the LIKE wildcards and the escape character", () => {
    expect(escapeLike("100%_a\\b")).toBe("100\\%\\_a\\\\b");
  });

  it("wraps the trimmed, escaped query for a contains match", () => {
    expect(containsPattern("  50% off ")).toBe("%50\\% off%");
  });
});

describe("digitsPattern", () => {
  it("compares phone numbers on digits only", () => {
    expect(digitsPattern("+52 55 1234")).toBe("%52551234%");
    expect(digitsPattern("(55) 12-34")).toBe("%551234%");
  });

  it("ignores queries with letters, so a code like store7 never matches phones", () => {
    expect(digitsPattern("store7")).toBeNull();
    expect(digitsPattern("Lucía 55")).toBeNull();
  });

  it("returns null without digits", () => {
    expect(digitsPattern("  +()- ")).toBeNull();
  });
});
