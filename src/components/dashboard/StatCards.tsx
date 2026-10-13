import { ChartColumnIcon, ClipboardListIcon, UsersIcon } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { formatNumber } from "@/lib/format";
import type { DashboardSummary } from "@/types/survey";

const COPY = {
  totalResponses: "Respuestas totales",
  activeSurveys: "Encuestas activas",
  todayResponses: "Respuestas hoy",
  todayHint: "Recibidas desde la medianoche",
  limitReached: "Límite alcanzado",
};

function getRemainingHint(remaining: number): string {
  if (remaining <= 0) return COPY.limitReached;
  return remaining === 1 ? "Queda 1 lugar disponible" : `Quedan ${remaining} lugares disponibles`;
}

interface StatCardsProps {
  summary: DashboardSummary;
  todayResponses: number;
  rangeLabel: string;
}

export function StatCards({ summary, todayResponses, rangeLabel }: StatCardsProps) {
  const remaining = summary.activeSurveyLimit - summary.activeSurveys;

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
      <StatCard
        highlighted
        label={COPY.totalResponses}
        value={formatNumber(summary.totalResponses)}
        hint={rangeLabel}
        icon={ChartColumnIcon}
      />
      <StatCard
        label={COPY.activeSurveys}
        value={formatNumber(summary.activeSurveys)}
        suffix={`/${summary.activeSurveyLimit}`}
        hint={getRemainingHint(remaining)}
        hintTone={remaining > 0 ? "success" : "muted"}
        icon={ClipboardListIcon}
      />
      <StatCard
        label={COPY.todayResponses}
        value={formatNumber(todayResponses)}
        hint={COPY.todayHint}
        icon={UsersIcon}
      />
    </div>
  );
}
