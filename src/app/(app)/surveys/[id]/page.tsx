import { GreetingTopBar } from "@/components/layout/GreetingTopBar";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SurveyForm } from "@/components/surveys/form/SurveyForm";
import { SurveyFormSkeleton } from "@/components/surveys/form/SurveyFormSkeleton";
import { getAppContext } from "@/lib/dashboard";
import { getSurveyEditData } from "@/lib/surveys/form-data";

// params is runtime data under Cache Components, so it is read inside Suspense
async function EditSurveyContent({ params }: Pick<PageProps<"/surveys/[id]">, "params">) {
  const { id } = await params;
  const { organization } = getAppContext();
  const data = getSurveyEditData(organization.id, id);

  // Unknown, deleted or another organization's survey: 404, never 403
  if (!data) notFound();

  return <SurveyForm mode="edit" defaultValues={data.values} meta={data.meta} />;
}

export default function EditSurveyPage({ params }: PageProps<"/surveys/[id]">) {
  return (
    <>
      {/* The page header; outside Suspense, so it is part of the static shell */}
      <GreetingTopBar />
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-10">
        <Suspense fallback={<SurveyFormSkeleton />}>
          <EditSurveyContent params={params} />
        </Suspense>
      </div>
    </>
  );
}
