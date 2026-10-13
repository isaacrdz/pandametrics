"use client";

import { ChartColumnIcon, ClipboardListIcon, UsersIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { StatCard } from "@/components/dashboard/StatCard";
import type { RangeKey } from "@/lib/date-range";
import type { DashboardSummary } from "@/types/survey";

interface StatCardsProps {
  summary: DashboardSummary;
  todayResponses: number;
  range: RangeKey;
}

export function StatCards({ summary, todayResponses, range }: StatCardsProps) {
  const t = useTranslations("dashboard.stats");
  const tRange = useTranslations("dateRange");
  const format = useFormatter();
  const remaining = Math.max(summary.activeSurveyLimit - summary.activeSurveys, 0);

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
      <StatCard
        highlighted
        label={t("totalResponses")}
        value={format.number(summary.totalResponses)}
        hint={tRange(range)}
        icon={ChartColumnIcon}
      />
      <StatCard
        label={t("activeSurveys")}
        value={format.number(summary.activeSurveys)}
        suffix={`/${summary.activeSurveyLimit}`}
        hint={t("remaining", { count: remaining })}
        hintTone={remaining > 0 ? "success" : "muted"}
        icon={ClipboardListIcon}
      />
      <StatCard
        label={t("todayResponses")}
        value={format.number(todayResponses)}
        hint={t("todayHint")}
        icon={UsersIcon}
      />
    </div>
  );
}
