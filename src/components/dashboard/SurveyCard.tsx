"use client";

import { useTranslations } from "next-intl";
import { SurveyResults } from "@/components/dashboard/SurveyResults";
import { SurveyActionsMenu, type SurveyActionsTarget } from "@/components/surveys/SurveyActionsMenu";
import type { SurveyCardData } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

interface SurveyCardProps extends SurveyCardData {
  activeCount: number;
  onDelete: (survey: SurveyActionsTarget) => void;
  // The card leaves the dashboard when its survey is moved to draft
  onRemoved: () => void;
}

export function SurveyCard({ survey, metrics, publicUrl, activeCount, onDelete, onRemoved }: SurveyCardProps) {
  const t = useTranslations("results");

  return (
    <article
      aria-labelledby={`survey-${survey.id}`}
      className="flex h-full flex-col gap-5 rounded-3xl border border-card-border bg-card p-5 sm:p-6"
    >
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 id={`survey-${survey.id}`} className="line-clamp-2 text-lg font-bold text-foreground sm:text-xl">
            {survey.name}
          </h3>
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            <span className="font-mono tracking-wide">{survey.code}</span>
            <span aria-hidden>·</span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={cn(
                  "size-2 rounded-full",
                  survey.isActive ? "bg-success shadow-[0_0_8px_var(--success)]" : "bg-muted-foreground/50",
                )}
              />
              {survey.isActive ? t("active") : t("inactive")}
            </span>
          </p>
        </div>
        <SurveyActionsMenu
          survey={{ id: survey.id, name: survey.name, code: survey.code, isActive: survey.isActive, publicUrl }}
          activeCount={activeCount}
          onDelete={onDelete}
          onStatusChanged={(isActive) => !isActive && onRemoved()}
          triggerVariant="outline"
          triggerClassName="shrink-0 rounded-xl border-card-border"
        />
      </header>
      <SurveyResults category={survey.category} metrics={metrics} />
    </article>
  );
}
