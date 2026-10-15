// Survey codes: 6 characters, A–Z and 0–9 (see newCode in service.ts)
export const SURVEY_CODE_LENGTH = 6;

const CODE_TOKEN = /\b[A-Z0-9]{6}\b/;
const CODE_ONLY = /^[A-Z0-9]{6}$/;

// Accepts a bare code, a link with ?code= or any text containing a code (a scanned QR, a pasted
// message). Returns the code in uppercase, or null. Never throws on text that is not a URL.
export function parseSurveyCode(text: string): string | null {
  const value = text.trim();
  if (!value) return null;

  try {
    const fromUrl = new URL(value).searchParams.get("code")?.trim().toUpperCase();
    if (fromUrl) return CODE_ONLY.test(fromUrl) ? fromUrl : null;
  } catch {
    // Not a URL: look for a code in the text
  }

  return value.toUpperCase().match(CODE_TOKEN)?.[0] ?? null;
}
