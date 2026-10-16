import "server-only";

// In-memory rate limits (kiosk submissions, sign-in, registration). Enough for one server process;
// they reset with the server. A shared store (Redis, Postgres) is later hardening.

export interface RateLimitRule {
  // At most `max` hits per key within `windowMs`
  windowMs: number;
  max: number;
  // And, optionally, at least this long between two hits
  minIntervalMs?: number;
}

export interface RateLimiter {
  // Whether any key is over its allowance; does not record anything
  isLimited(keys: string[], now?: number): boolean;
  record(keys: string[], now?: number): void;
  // Checks every key first and records only when none is limited, so a rejected attempt does not
  // use up the allowance
  take(keys: string[], now?: number): boolean;
}

const globalForLimiters = globalThis as unknown as { pandaRateLimits?: Map<string, Map<string, number[]>> };

// One hit list per limiter name, on globalThis so it survives Fast Refresh in development
function hitsFor(name: string): Map<string, number[]> {
  globalForLimiters.pandaRateLimits ??= new Map();
  let hits = globalForLimiters.pandaRateLimits.get(name);
  if (!hits) {
    hits = new Map();
    globalForLimiters.pandaRateLimits.set(name, hits);
  }
  return hits;
}

export function createRateLimiter(name: string, rule: RateLimitRule): RateLimiter {
  const hits = hitsFor(name);

  function recent(key: string, now: number): number[] {
    const list = (hits.get(key) ?? []).filter((time) => now - time < rule.windowMs);
    if (list.length > 0) hits.set(key, list);
    else hits.delete(key);
    return list;
  }

  function isLimited(keys: string[], now = Date.now()): boolean {
    return keys.some((key) => {
      const list = recent(key, now);
      const last = list.at(-1);
      const tooSoon = rule.minIntervalMs !== undefined && last !== undefined && now - last < rule.minIntervalMs;
      return tooSoon || list.length >= rule.max;
    });
  }

  function record(keys: string[], now = Date.now()): void {
    for (const key of keys) hits.set(key, [...recent(key, now), now]);
  }

  return {
    isLimited,
    record,
    take(keys, now = Date.now()) {
      if (isLimited(keys, now)) return false;
      record(keys, now);
      return true;
    },
  };
}
