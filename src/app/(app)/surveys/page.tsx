import type { Metadata } from "next";
import { Suspense } from "react";
import { SurveysTableSection } from "@/components/surveys/table/SurveysTableSection";
import { SurveysTableSkeleton } from "@/components/surveys/table/SurveysTableSkeleton";
import { getAppContext } from "@/lib/dashboard";
import { parseRange } from "@/lib/date-range";
import { listSurveys } from "@/lib/surveys/list";

export const metadata: Metadata = {
  title: "Surveys · Panda Metrics",
};

// searchParams is runtime data under Cache Components, so it is read inside Suspense
async function SurveysContent({ searchParams }: Pick<PageProps<"/surveys">, "searchParams">) {
  const params = await searchParams;
  const range = parseRange(params.range);
  const { organization } = getAppContext();
  const data = listSurveys(organization.id, { range });

  return <SurveysTableSection data={data} range={range} />;
}

export default function SurveysPage({ searchParams }: PageProps<"/surveys">) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">
      <Suspense fallback={<SurveysTableSkeleton />}>
        <SurveysContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
