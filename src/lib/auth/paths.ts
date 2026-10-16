// Auth pages and where a sign-in lands. No server-only imports: the proxy and Client Components
// use them too

export const SIGN_IN_PATH = "/sign-in";
export const REGISTER_PATH = "/register";
export const DEFAULT_AFTER_SIGN_IN = "/dashboard";
// Signed in without an organization: create one (or, later, accept an invitation)
export const WELCOME_PATH = "/welcome";

// Only a path on this site ("/surveys?page=2"), never another origin ("//evil.com",
// "https://…", "/\evil.com"): an open redirect would let a link send people anywhere after signing in
export function safeCallbackUrl(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return DEFAULT_AFTER_SIGN_IN;
  }
  return value;
}
