import { SurveyFormSkeleton } from "@/components/surveys/form/SurveyFormSkeleton";

export default function EditSurveyLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-10">
      <SurveyFormSkeleton />
    </div>
  );
}
