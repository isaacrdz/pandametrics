import { Suspense } from "react";
import { RequireOrganization } from "@/components/layout/RequireOrganization";
import { SurveyForm } from "@/components/surveys/form/SurveyForm";
import { EMPTY_SURVEY_VALUES } from "@/lib/surveys/form-values";

// The form renders its own top bar (title and submit button) inside the <form>. It stays in the
// static shell; the organization check streams next to it
export default function NewSurveyPage() {
  return (
    <>
      <Suspense>
        <RequireOrganization />
      </Suspense>
      <SurveyForm mode="create" defaultValues={EMPTY_SURVEY_VALUES} />
    </>
  );
}
