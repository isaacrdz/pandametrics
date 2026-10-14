import { normalizeSearch } from "@/lib/format";
import type { Survey } from "@/types/survey";

// Search by name or code, ignoring accents and case. Shared by the dashboard and the survey table.
export function matchesQuery(survey: Pick<Survey, "name" | "code">, query: string): boolean {
  if (!query) return true;
  const normalized = normalizeSearch(query);
  return (
    normalizeSearch(survey.name).includes(normalized) ||
    normalizeSearch(survey.code).includes(normalized)
  );
}
