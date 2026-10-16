import { GreetingTopBar } from "@/components/layout/GreetingTopBar";
import { Suspense } from "react";
import { CreateSurveyCallout } from "@/components/dashboard/CreateSurveyCallout";
import { DashboardFooter } from "@/components/dashboard/DashboardFooter";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { DashboardTitle } from "@/components/dashboard/DashboardTitle";
import { getDashboardData } from "@/lib/dashboard";
import { getAppContext } from "@/server/app-context";
import { parseRange } from "@/lib/date-range";

// Server Component: fetches data only. Translated text is rendered by Client Components,
// because the language lives in the browser (localStorage).
async function DashboardContent({ searchParams }: Pick<PageProps<"/dashboard">, "searchParams">) {
  const params = await searchParams;
  const range = parseRange(params.range);
  const query = typeof params.q === "string" ? params.q : "";
  const { organization } = await getAppContext();
  const data = await getDashboardData(organization.id, range, query);

  return (
    <DashboardSection
      cards={data.cards}
      activeSurveyCount={data.activeSurveyCount}
      query={query}
      range={range}
    />
  );
}

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <>
      {/* The page header; outside Suspense, so it is part of the static shell */}
      <GreetingTopBar />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 md:px-8 md:py-10">
        <DashboardTitle />
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent searchParams={searchParams} />
        </Suspense>
        <CreateSurveyCallout />
        <DashboardFooter />
      </div>
    </>
  );
}
