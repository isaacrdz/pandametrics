import type { Metadata } from "next";
import { Suspense } from "react";
import { SurveysTableSection } from "@/components/surveys/table/SurveysTableSection";
import { SurveysTableSkeleton } from "@/components/surveys/table/SurveysTableSkeleton";
import { SurveysTopBar } from "@/components/surveys/table/SurveysTopBar";
import { getAppContext } from "@/server/app-context";
import { countListedSurveys, listSurveys } from "@/lib/surveys/list";
import { parseSurveyListParams } from "@/lib/surveys/list-params";

export const metadata: Metadata = {
  title: "Surveys · Panda Metrics",
};

// searchParams is runtime data under Cache Components, so it is read inside Suspense
async function SurveysContent({ searchParams }: Pick<PageProps<"/surveys">, "searchParams">) {
  const params = parseSurveyListParams(await searchParams);
  const { organization } = await getAppContext();
  const data = await listSurveys(organization.id, params);

  return <SurveysTableSection data={data} params={params} />;
}

// The count needs the signed-in user's organization (the session, request data). Inside its own
// Suspense, so a navigation shows the bar at once and the number streams in; cached and tagged, so
// it refreshes after survey actions
async function SurveysTopBarWithCount() {
  const { organization } = await getAppContext();
  return <SurveysTopBar count={await countListedSurveys(organization.id)} />;
}

export default function SurveysPage({ searchParams }: PageProps<"/surveys">) {
  return (
    <>
      <Suspense fallback={<SurveysTopBar />}>
        <SurveysTopBarWithCount />
      </Suspense>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">
        <Suspense fallback={<SurveysTableSkeleton />}>
          <SurveysContent searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
