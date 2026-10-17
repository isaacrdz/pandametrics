"use server";

import { searchQuerySchema } from "@/lib/search/schema";
import { recentSurveys, searchOrganization } from "@/lib/search/service";
import { EMPTY_SEARCH_RESULTS, type SearchResults } from "@/lib/search/types";
import { getSessionAppContext } from "@/server/app-context";
import { createRateLimiter } from "@/server/rate-limit";

// The command palette's search. Errors are codes, never text: the client shows one message for all

export type SearchActionErrorCode = "UNAUTHENTICATED" | "RATE_LIMITED" | "VALIDATION" | "UNKNOWN";

export type SearchActionResult =
  | { success: true; data: SearchResults }
  | { success: false; error: { code: SearchActionErrorCode } };

// Debounced on the client; this only stops a runaway loop or a script: 60 searches a minute per user
const searchLimiter = createRateLimiter("search", { windowMs: 60_000, max: 60 });

function failure(code: SearchActionErrorCode): SearchActionResult {
  return { success: false, error: { code } };
}

// Surveys and people in the active organization matching the query, or the recent surveys when it
// is blank. The organization comes from the session, never from the client; without one there is
// nothing to search, which is not an error (the palette still offers pages and actions)
export async function searchWorkspace(query: string): Promise<SearchActionResult> {
  const parsed = searchQuerySchema.safeParse(query);
  if (!parsed.success) return failure("VALIDATION");

  const session = await getSessionAppContext();
  if (session.status === "signed-out") return failure("UNAUTHENTICATED");
  if (session.status === "no-organization") return { success: true, data: EMPTY_SEARCH_RESULTS };

  const { user, organization } = session.context;
  if (!searchLimiter.take([user.id])) return failure("RATE_LIMITED");

  try {
    if (!parsed.data) {
      return { success: true, data: { ...EMPTY_SEARCH_RESULTS, surveys: await recentSurveys(organization.id) } };
    }
    return { success: true, data: await searchOrganization(organization.id, user.id, parsed.data) };
  } catch (error) {
    console.error(error);
    return failure("UNKNOWN");
  }
}
