// Codes that come back as ?error= from Auth.js (Google) or from the sign-in action and register API.
// Anything else (Verification, OAuthCallbackError, …) shows the default message
export const AUTH_ERROR_CODES = [
  "CredentialsSignin",
  "AccessDenied",
  "OAuthAccountNotLinked",
  "Configuration",
  "EMAIL_TAKEN",
  "RATE_LIMITED",
  "VALIDATION",
] as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number] | "default";

export function toAuthErrorCode(value: string | null | undefined): AuthErrorCode | null {
  if (!value) return null;
  return AUTH_ERROR_CODES.find((code) => code === value) ?? "default";
}
