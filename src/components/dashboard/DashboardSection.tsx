"use client";

import Link from "next/link";
import { ArrowRightIcon, ClipboardListIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { CollectionsToolbar } from "@/components/dashboard/CollectionsToolbar";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { SurveyGrid } from "@/components/dashboard/SurveyGrid";
import type { SurveyCardData } from "@/lib/dashboard";
import { DEFAULT_RANGE, type RangeKey } from "@/lib/date-range";

interface DashboardSectionProps {
  cards: SurveyCardData[];
  activeSurveyCount: number;
  query: string;
  range: RangeKey;
}

export function DashboardSection({ cards, activeSurveyCount, query, range }: DashboardSectionProps) {
  const t = useTranslations("dashboard");

  return (
    <section aria-labelledby="surveys-title" className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-baseline gap-4">
            <h2 id="surveys-title" className="text-2xl font-bold text-foreground sm:text-3xl">
              {t("surveys.title")}
            </h2>
            {/* The dashboard only lists active surveys; drafts live in the table */}
            <Link
              href="/surveys"
              className="inline-flex items-center gap-1 rounded-md text-sm font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t("surveys.viewAll")}
              <ArrowRightIcon aria-hidden className="size-4" />
            </Link>
          </div>
          <p className="mt-1 text-muted-foreground">{t("surveys.subtitle")}</p>
        </div>
        <CollectionsToolbar query={query} range={range} />
      </div>

      {activeSurveyCount === 0 ? (
        <EmptyState
          icon={ClipboardListIcon}
          title={t("empty.title")}
          description={t("empty.description")}
        />
      ) : (
        <SurveyGrid
          cards={cards}
          query={query}
          clearSearchHref={range === DEFAULT_RANGE ? "/dashboard" : `/dashboard?range=${range}`}
        />
      )}
    </section>
  );
}
