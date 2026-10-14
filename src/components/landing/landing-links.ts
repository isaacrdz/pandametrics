// No Auth.js yet: every account call to action opens the dashboard. Change these when
// /login and /signup exist.
export const LANDING_LINKS = {
  signIn: "/dashboard",
  signUp: "/dashboard",
  start: "/dashboard",
} as const;

export const SECTION_IDS = {
  features: "features",
  howItWorks: "how-it-works",
} as const;

// Solid pink ring with a gap, 3:1 on the page and on cards (checked in check-contrast.mjs).
// The shared button ring is 50% pink, too faint for the landing's large surfaces.
export const FOCUS_RING =
  "outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// Constant, not the server clock: reading the time would make the static page dynamic
export const COPYRIGHT_YEAR = 2026;
