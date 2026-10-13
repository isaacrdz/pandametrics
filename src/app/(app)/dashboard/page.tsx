import { Suspense } from "react";
import { ClipboardListIcon } from "lucide-react";
import { CollectionsToolbar } from "@/components/dashboard/CollectionsToolbar";
import { CreateSurveyCallout } from "@/components/dashboard/CreateSurveyCallout";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { StatCards } from "@/components/dashboard/StatCards";
import { SurveyGrid } from "@/components/dashboard/SurveyGrid";
import { getAppContext, getDashboardData } from "@/lib/dashboard";
import { DEFAULT_RANGE, getRangeLabel, parseRange } from "@/lib/date-range";

const COPY = {
  title: "Tus encuestas",
  subtitle: "Así se sienten tus clientes.",
  emptyTitle: "Todavía no tienes encuestas activas",
  emptyDescription: "Activa una encuesta o crea una nueva para ver aquí sus resultados.",
  footer: "Panda Metrics · Tus opiniones, medibles",
};

async function DashboardContent({ searchParams }: Pick<PageProps<"/dashboard">, "searchParams">) {
  const params = await searchParams;
  const range = parseRange(params.range);
  const query = typeof params.q === "string" ? params.q : "";
  const { organization } = getAppContext();
  const data = getDashboardData(organization.id, range, query);

  return (
    <>
      <StatCards
        summary={data.summary}
        todayResponses={data.todayResponses}
        rangeLabel={getRangeLabel(range)}
      />

      <section aria-labelledby="surveys-title" className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="surveys-title" className="text-2xl font-bold text-foreground sm:text-3xl">
              {COPY.title}
            </h2>
            <p className="mt-1 text-muted-foreground">{COPY.subtitle}</p>
          </div>
          <CollectionsToolbar query={query} range={range} />
        </div>

        {data.activeSurveyCount === 0 ? (
          <EmptyState
            icon={ClipboardListIcon}
            title={COPY.emptyTitle}
            description={COPY.emptyDescription}
          />
        ) : (
          <SurveyGrid
            cards={data.cards}
            query={query}
            clearSearchHref={range === DEFAULT_RANGE ? "/dashboard" : `/dashboard?range=${range}`}
          />
        )}
      </section>
    </>
  );
}

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 md:px-8 md:py-10">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent searchParams={searchParams} />
      </Suspense>
      <CreateSurveyCallout />
      <footer className="pb-2 text-center text-sm text-muted-foreground">{COPY.footer}</footer>
    </div>
  );
}
