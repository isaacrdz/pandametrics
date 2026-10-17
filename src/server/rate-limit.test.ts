import { describe, expect, it } from "vitest";
import { createRateLimiter } from "@/server/rate-limit";

// Hit lists live on globalThis per limiter name, so every test uses its own name
let counter = 0;
function limiter(rule: Parameters<typeof createRateLimiter>[1]) {
  counter += 1;
  return createRateLimiter(`test-${counter}`, rule);
}

describe("createRateLimiter", () => {
  it("allows up to max hits in the window, then limits", () => {
    const limit = limiter({ windowMs: 1000, max: 2 });
    expect(limit.take(["a"], 0)).toBe(true);
    expect(limit.take(["a"], 10)).toBe(true);
    expect(limit.take(["a"], 20)).toBe(false);
  });

  it("frees the allowance as old hits leave the window", () => {
    const limit = limiter({ windowMs: 1000, max: 1 });
    expect(limit.take(["a"], 0)).toBe(true);
    expect(limit.take(["a"], 999)).toBe(false);
    expect(limit.take(["a"], 1000)).toBe(true);
  });

  it("enforces the minimum interval between hits", () => {
    const limit = limiter({ windowMs: 60_000, max: 30, minIntervalMs: 3000 });
    expect(limit.take(["device"], 0)).toBe(true);
    expect(limit.take(["device"], 2999)).toBe(false);
    expect(limit.take(["device"], 3000)).toBe(true);
  });

  it("keeps keys independent", () => {
    const limit = limiter({ windowMs: 1000, max: 1 });
    expect(limit.take(["a"], 0)).toBe(true);
    expect(limit.take(["b"], 0)).toBe(true);
  });

  it("rejects when any key is limited and records none of them", () => {
    const limit = limiter({ windowMs: 1000, max: 1 });
    limit.record(["ip"], 0);
    expect(limit.take(["ip", "email"], 10)).toBe(false);
    // The rejected attempt did not use up the email's allowance
    expect(limit.isLimited(["email"], 10)).toBe(false);
  });

  it("does not record when only checking", () => {
    const limit = limiter({ windowMs: 1000, max: 1 });
    expect(limit.isLimited(["a"], 0)).toBe(false);
    expect(limit.isLimited(["a"], 0)).toBe(false);
    expect(limit.take(["a"], 0)).toBe(true);
  });
});
