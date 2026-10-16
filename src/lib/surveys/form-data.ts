import "server-only";

import { cacheTag } from "next/cache";
import { getPublicSurveyUrl } from "@/lib/dashboard";
import { toFormValues, type SurveyFormMeta } from "@/lib/surveys/form-values";
import { surveysTag, surveyTag } from "@/lib/surveys/list";
import type { SurveyFormInput } from "@/lib/surveys/schema";
import { getSurvey, hasResponses } from "@/lib/surveys/service";
import { getUserById } from "@/lib/users/service";

export interface SurveyEditData {
  values: SurveyFormInput;
  meta: SurveyFormMeta;
}

// null for unknown, deleted or other organizations' surveys (the page shows a 404).
// Cached; survey actions and kiosk answers expire it with updateTag
export async function getSurveyEditData(organizationId: string, id: string): Promise<SurveyEditData | null> {
  "use cache";
  cacheTag(surveysTag(organizationId), surveyTag(id));

  const survey = await getSurvey(organizationId, id);
  if (!survey) return null;

  // From the database, deleted users included, so a renamed or deleted creator still shows up
  const [creator, answered] = await Promise.all([getUserById(survey.createdById), hasResponses(survey.id)]);

  return {
    values: toFormValues(survey),
    meta: {
      id: survey.id,
      code: survey.code,
      publicUrl: getPublicSurveyUrl(survey.code),
      createdAt: survey.createdAt,
      createdBy: creator ? { name: creator.name, email: creator.email } : null,
      hasResponses: answered,
    },
  };
}
