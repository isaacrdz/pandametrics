"use client";

import Link from "next/link";
import { PencilIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { CopyButton } from "@/components/dashboard/CopyButton";
import { SurveyResults } from "@/components/dashboard/SurveyResults";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SurveyCardData } from "@/lib/dashboard";

const ICON_BUTTON_CLASS = "size-11 rounded-xl [&_svg:not([class*='size-'])]:size-5";

export function SurveyCard({ survey, metrics, publicUrl }: SurveyCardData) {
  const t = useTranslations("surveyCard");

  return (
    <article
      aria-labelledby={`survey-${survey.id}`}
      className="flex flex-col gap-6 rounded-3xl border border-card-border bg-card p-5 sm:p-8"
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 id={`survey-${survey.id}`} className="text-xl font-bold text-foreground sm:text-2xl">
            {survey.name}
          </h3>
          {survey.description && <p className="mt-1.5 text-muted-foreground">{survey.description}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          <CopyButton
            icon="link"
            value={publicUrl}
            label={t("copyLink")}
            successMessage={t("linkCopied")}
            className={`${ICON_BUTTON_CLASS} border border-card-border bg-card text-primary hover:bg-accent hover:text-primary`}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                size="icon"
                className={`${ICON_BUTTON_CLASS} shadow-[0_10px_24px_-12px_var(--primary)]`}
              >
                <Link href={`/surveys/${survey.id}`} aria-label={t("editLabel", { name: survey.name })}>
                  <PencilIcon aria-hidden />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("edit")}</TooltipContent>
          </Tooltip>
        </div>
      </header>
      <SurveyResults
        category={survey.category}
        code={survey.code}
        isActive={survey.isActive}
        metrics={metrics}
      />
    </article>
  );
}
