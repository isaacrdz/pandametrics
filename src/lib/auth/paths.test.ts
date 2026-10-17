import { describe, expect, it } from "vitest";
import { DEFAULT_AFTER_SIGN_IN, safeCallbackUrl } from "@/lib/auth/paths";

describe("safeCallbackUrl", () => {
  it("keeps a path on this site, with its query", () => {
    expect(safeCallbackUrl("/surveys?page=2")).toBe("/surveys?page=2");
    expect(safeCallbackUrl("/")).toBe("/");
  });

  it.each(["//evil.com", "/\\evil.com", "https://evil.com", "evil.com", "", "javascript:alert(1)"])(
    "drops %j",
    (value) => {
      expect(safeCallbackUrl(value)).toBe(DEFAULT_AFTER_SIGN_IN);
    },
  );

  it("drops values that are not strings", () => {
    expect(safeCallbackUrl(undefined)).toBe(DEFAULT_AFTER_SIGN_IN);
    expect(safeCallbackUrl(["/surveys"])).toBe(DEFAULT_AFTER_SIGN_IN);
  });
});
