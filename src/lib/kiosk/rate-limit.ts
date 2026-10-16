import "server-only";

// In-memory rate limit for public submissions (per device and per IP). Enough for one server
// process; it resets with the server. A shared store (Redis, Postgres) is later hardening.

const MIN_INTERVAL_MS = 3_000;
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 30;

const globalForLimiter = globalThis as unknown as { pandaKioskSubmissions?: Map<string, number[]> };

function getHits(): Map<string, number[]> {
  globalForLimiter.pandaKioskSubmissions ??= new Map();
  return globalForLimiter.pandaKioskSubmissions;
}

function isLimited(key: string, now: number): boolean {
  const recent = (getHits().get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  getHits().set(key, recent);
  const last = recent.at(-1);
  return (last !== undefined && now - last < MIN_INTERVAL_MS) || recent.length >= MAX_PER_WINDOW;
}

// Checks every key first and records the submission only when none is limited, so a rejected
// attempt does not use up the allowance
export function takeSubmissionSlot(keys: string[], now = Date.now()): boolean {
  if (keys.some((key) => isLimited(key, now))) return false;
  for (const key of keys) getHits().set(key, [...(getHits().get(key) ?? []), now]);
  return true;
}
