import "server-only";

import { MOCK_RESPONSES } from "@/lib/mock-data";
import type { SurveyResponse } from "@/types/survey";

// In-memory response store with the functions the Prisma service will have. Seeded with the mock
// responses; kiosk submissions are added on top. It lives on globalThis so it survives Fast
// Refresh, resets when the server restarts and is not shared between server processes.

const globalForStore = globalThis as unknown as { pandaResponseStore?: SurveyResponse[] };

function getStore(): SurveyResponse[] {
  globalForStore.pandaResponseStore ??= MOCK_RESPONSES.map((response) => structuredClone(response));
  return globalForStore.pandaResponseStore;
}

export function listResponses(surveyId?: string): SurveyResponse[] {
  const store = getStore();
  return surveyId ? store.filter((response) => response.surveyId === surveyId) : store;
}

export function addResponse(response: SurveyResponse): void {
  getStore().push(response);
}
