import { DEFAULT_AFTER_SIGN_IN, REGISTER_PATH, SIGN_IN_PATH } from "@/lib/auth/paths";

// Account calls to action. "Start" opens the dashboard: signed-out visitors are sent to sign in
// by the proxy and come back afterwards
export const LANDING_LINKS = {
  signIn: SIGN_IN_PATH,
  signUp: REGISTER_PATH,
  start: DEFAULT_AFTER_SIGN_IN,
} as const;

export const SECTION_IDS = {
  features: "features",
  howItWorks: "how-it-works",
} as const;

// Solid primary ring with a gap, 3:1 on the page and on cards (checked in check-contrast.mjs).
// The shared button ring is 50% primary, too faint for the landing's large surfaces.
export const FOCUS_RING =
  "outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// Constant, not the server clock: reading the time would make the static page dynamic
export const COPYRIGHT_YEAR = 2026;
