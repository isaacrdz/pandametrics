"use client";

import { ClipboardListIcon } from "lucide-react";
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
          <h2 id="surveys-title" className="text-2xl font-bold text-foreground sm:text-3xl">
            {t("surveys.title")}
          </h2>
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
