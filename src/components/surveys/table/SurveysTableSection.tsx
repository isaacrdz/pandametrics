"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarIcon, ClipboardListIcon, PlusIcon, SearchXIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { SurveysList } from "@/components/surveys/table/SurveysList";
import { SurveysPagination } from "@/components/surveys/table/SurveysPagination";
import { SurveysTable } from "@/components/surveys/table/SurveysTable";
import { SurveysToolbar } from "@/components/surveys/table/SurveysToolbar";
import { Button } from "@/components/ui/button";
import { useUrlSearch } from "@/hooks/use-url-search";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RANGE_KEYS, parseRange } from "@/lib/date-range";
import type { SurveyListResult } from "@/lib/surveys/list";
import { DEFAULT_SURVEY_LIST_QUERY, buildSurveysHref, withFilters, type SurveyListQuery } from "@/lib/surveys/list-params";

interface SurveysTableSectionProps {
  data: SurveyListResult;
  params: SurveyListQuery;
}

export function SurveysTableSection({ data, params }: SurveysTableSectionProps) {
  const t = useTranslations("surveys");
  const tRange = useTranslations("dateRange");
  const format = useFormatter();
  const router = useRouter();

  function navigate(next: SurveyListQuery) {
    router.replace(buildSurveysHref(next), { scroll: false });
  }

  const { search, handleChange, commit } = useUrlSearch(params.query, (query) =>
    navigate(withFilters(params, { query })),
  );

  // The range only sets the window of the Responses column; it never hides rows
  function handleRangeChange(value: string) {
    navigate(withFilters(params, { range: parseRange(value), query: commit(search) }));
  }

  // Clearing the filters keeps the range: it is not a filter, it is the responses window
  const clearFiltersHref = buildSurveysHref({ ...DEFAULT_SURVEY_LIST_QUERY, range: params.range });

  return (
    <section aria-labelledby="surveys-title" className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 id="surveys-title" className="text-2xl font-bold text-foreground sm:text-3xl">
            {t("title")}
            <span className="ml-3 text-lg font-medium text-muted-foreground tabular-nums">{format.number(data.totalAll)}</span>
          </h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Select value={params.range} onValueChange={handleRangeChange}>
          <SelectTrigger
            aria-label={t("toolbar.range")}
            className="h-11! w-full gap-2 rounded-full bg-card px-4 text-[0.95rem] sm:w-48"
          >
            <CalendarIcon aria-hidden className="size-4 text-primary" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end" className="rounded-xl">
            {RANGE_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {tRange(key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {data.totalAll === 0 ? (
        <EmptyState
          icon={ClipboardListIcon}
          title={t("empty.title")}
          description={t("empty.description")}
          action={
            <Button asChild className="h-11 gap-2 rounded-xl px-5 font-semibold">
              <Link href="/surveys/new">
                <PlusIcon aria-hidden />
                {t("empty.cta")}
              </Link>
            </Button>
          }
        />
      ) : (
        // Container queries, not viewport breakpoints: the sidebar takes part of the width,
        // so at a 768px viewport the card is only ~450px wide
        <div className="@container overflow-hidden rounded-3xl border border-card-border bg-card">
          <SurveysToolbar params={params} search={search} onSearchChange={handleChange} commitSearch={commit} />
          {data.total === 0 ? (
            <EmptyState
              icon={SearchXIcon}
              title={t("noResults.title")}
              description={t("noResults.description")}
              className="rounded-none border-0"
              action={
                <Button asChild variant="outline" className="rounded-xl">
                  <Link href={clearFiltersHref} scroll={false}>
                    {t("noResults.clear")}
                  </Link>
                </Button>
              }
            />
          ) : (
            <>
              <div className="hidden @2xl:block">
                <SurveysTable rows={data.rows} now={data.now} range={params.range} />
              </div>
              <div className="@2xl:hidden">
                <SurveysList rows={data.rows} now={data.now} />
              </div>
            </>
          )}
          {data.total > 0 && (
            <SurveysPagination
              params={params}
              page={data.page}
              pageCount={data.pageCount}
              pageSize={data.pageSize}
              total={data.total}
            />
          )}
        </div>
      )}
    </section>
  );
}
