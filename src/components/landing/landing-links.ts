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

// Constant, not the server clock: reading the time would make the static page dynamic
export const COPYRIGHT_YEAR = 2026;
