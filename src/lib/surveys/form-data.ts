import "server-only";

import { getPublicSurveyUrl } from "@/lib/dashboard";
import { toFormValues, type SurveyFormMeta } from "@/lib/surveys/form-values";
import type { SurveyFormInput } from "@/lib/surveys/schema";
import { getSurvey, getUser, hasResponses } from "@/lib/surveys/service";

export interface SurveyEditData {
  values: SurveyFormInput;
  meta: SurveyFormMeta;
}

// null for unknown, deleted or other organizations' surveys (the page shows a 404)
export function getSurveyEditData(organizationId: string, id: string): SurveyEditData | null {
  const survey = getSurvey(organizationId, id);
  if (!survey) return null;

  const creator = getUser(survey.createdById);

  return {
    values: toFormValues(survey),
    meta: {
      id: survey.id,
      code: survey.code,
      publicUrl: getPublicSurveyUrl(survey.code),
      createdAt: survey.createdAt,
      createdBy: creator ? { name: creator.name, email: creator.email } : null,
      hasResponses: hasResponses(survey.id),
    },
  };
}
