import { SurveyForm } from "@/components/surveys/form/SurveyForm";
import { EMPTY_SURVEY_VALUES } from "@/lib/surveys/form-values";

export default function NewSurveyPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-10">
      <SurveyForm mode="create" defaultValues={EMPTY_SURVEY_VALUES} />
    </div>
  );
}
