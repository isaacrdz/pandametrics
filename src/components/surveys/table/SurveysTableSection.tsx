"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarIcon, ClipboardListIcon, PlusIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { SurveysList } from "@/components/surveys/table/SurveysList";
import { SurveysTable } from "@/components/surveys/table/SurveysTable";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_RANGE, RANGE_KEYS, parseRange, type RangeKey } from "@/lib/date-range";
import type { SurveyListResult } from "@/lib/surveys/list";

interface SurveysTableSectionProps {
  data: SurveyListResult;
  range: RangeKey;
}

export function SurveysTableSection({ data, range }: SurveysTableSectionProps) {
  const t = useTranslations("surveys");
  const tRange = useTranslations("dateRange");
  const format = useFormatter();
  const router = useRouter();
  const pathname = usePathname();

  // The range only sets the window of the Responses column; it never hides rows
  function handleRangeChange(value: string) {
    const next = parseRange(value);
    router.replace(next === DEFAULT_RANGE ? pathname : `${pathname}?range=${next}`, { scroll: false });
  }

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
        <Select value={range} onValueChange={handleRangeChange}>
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
          <div className="hidden @2xl:block">
            <SurveysTable rows={data.rows} now={data.now} range={range} />
          </div>
          <div className="@2xl:hidden">
            <SurveysList rows={data.rows} now={data.now} />
          </div>
        </div>
      )}
    </section>
  );
}
