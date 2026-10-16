import "server-only";

import { createRateLimiter } from "@/server/rate-limit";

// Public kiosk submissions, per device and per IP: one every 3 s and 30 per 10 minutes
const kioskLimiter = createRateLimiter("kiosk-submissions", {
  minIntervalMs: 3_000,
  windowMs: 10 * 60_000,
  max: 30,
});

export function takeSubmissionSlot(keys: string[], now = Date.now()): boolean {
  return kioskLimiter.take(keys, now);
}
