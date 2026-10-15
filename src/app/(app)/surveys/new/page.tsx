import { SurveyForm } from "@/components/surveys/form/SurveyForm";
import { EMPTY_SURVEY_VALUES } from "@/lib/surveys/form-values";

// The form renders its own top bar (title and submit button) inside the <form>
export default function NewSurveyPage() {
  return <SurveyForm mode="create" defaultValues={EMPTY_SURVEY_VALUES} />;
}
