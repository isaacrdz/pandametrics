"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRightIcon, ClipboardListIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { CollectionsToolbar } from "@/components/dashboard/CollectionsToolbar";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { SurveyGrid } from "@/components/dashboard/SurveyGrid";
import { useLiveDashboard } from "@/components/dashboard/use-live-dashboard";
import type { SurveyCardData } from "@/lib/dashboard";
import type { DashboardRange } from "@/lib/dashboard-range";

interface DashboardSectionProps {
  cards: SurveyCardData[];
  activeSurveyCount: number;
  range: DashboardRange;
}

export function DashboardSection({ cards, activeSurveyCount, range }: DashboardSectionProps) {
  const t = useTranslations("dashboard");
  const headingRef = useRef<HTMLHeadingElement>(null);
  // New kiosk answers and survey changes show up without a reload
  useLiveDashboard();

  // Wait for the dialog or menu to finish restoring focus before moving it
  function focusHeading() {
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  return (
    // A container: with the sidebar open the section is much narrower than the viewport
    <section aria-labelledby="surveys-title" className="@container/surveys flex flex-col gap-6">
      <div className="flex flex-col gap-4 @3xl/surveys:flex-row @3xl/surveys:items-end @3xl/surveys:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2
              ref={headingRef}
              id="surveys-title"
              tabIndex={-1}
              className="rounded-md text-2xl font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:text-3xl"
            >
              {t("surveys.title")}
            </h2>
            {/* The dashboard only lists active surveys; drafts live in the table */}
            <Link
              href="/surveys"
              className="inline-flex items-center gap-1 rounded-md text-sm whitespace-nowrap font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t("surveys.viewAll")}
              <ArrowRightIcon aria-hidden className="size-4" />
            </Link>
          </div>
          <p className="mt-1 text-muted-foreground">{t("surveys.subtitle")}</p>
        </div>
        <CollectionsToolbar range={range} />
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
          activeCount={activeSurveyCount}
          onCardRemoved={focusHeading}
        />
      )}
    </section>
  );
}
