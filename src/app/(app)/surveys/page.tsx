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

export default async function SurveysPage({ searchParams }: PageProps<"/surveys">) {
  // The total does not depend on the URL, so the bar (title + count) is part of the static shell
  const { organization } = await getAppContext();
  const total = await countListedSurveys(organization.id);

  return (
    <>
      <SurveysTopBar count={total} />
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">
        <Suspense fallback={<SurveysTableSkeleton />}>
          <SurveysContent searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
