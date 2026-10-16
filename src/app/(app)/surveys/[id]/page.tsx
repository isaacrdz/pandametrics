import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SurveyForm } from "@/components/surveys/form/SurveyForm";
import { SurveyFormSkeleton } from "@/components/surveys/form/SurveyFormSkeleton";
import { getAppContext } from "@/server/app-context";
import { getSurveyEditData } from "@/lib/surveys/form-data";

// params is runtime data under Cache Components, so it is read inside Suspense
async function EditSurveyContent({ params }: Pick<PageProps<"/surveys/[id]">, "params">) {
  const { id } = await params;
  const { organization } = await getAppContext();
  const data = getSurveyEditData(organization.id, id);

  // Unknown, deleted or another organization's survey: 404, never 403
  if (!data) notFound();

  return <SurveyForm mode="edit" defaultValues={data.values} meta={data.meta} />;
}

// The form renders its own top bar inside the <form>; while the survey loads, the skeleton
// shows the same bar (static title, disabled submit), so the header never changes
export default function EditSurveyPage({ params }: PageProps<"/surveys/[id]">) {
  return (
    <Suspense fallback={<SurveyFormSkeleton />}>
      <EditSurveyContent params={params} />
    </Suspense>
  );
}
