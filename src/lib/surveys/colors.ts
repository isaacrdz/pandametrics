// Decorative dot that tells survey rows apart. Stable per survey (derived from the id) until
// surveys get their own color; never the only carrier of meaning.
export const SURVEY_DOT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--brand)",
] as const;

// FNV-1a: same index on the server and the client
export function getSurveyColorIndex(id: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % SURVEY_DOT_COLORS.length;
}
