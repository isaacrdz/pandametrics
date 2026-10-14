"use client";

import { useState, type KeyboardEvent } from "react";
import { ChevronLeftIcon, ChevronRightIcon, StarIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { OptionList } from "@/components/dashboard/OptionList";
import { Button } from "@/components/ui/button";
import type { SurveyCategory, SurveyMetrics } from "@/types/survey";

interface QuestionPagerProps {
  count: number;
  index: number;
  totalResponses: number;
  onChange: (index: number) => void;
}

function QuestionPager({ count, index, totalResponses, onChange }: QuestionPagerProps) {
  const t = useTranslations("results");
  const tCommon = useTranslations("common");
  const responses = tCommon("responses", { count: totalResponses });

  // One question: the pager only carries the survey total
  if (count <= 1) {
    return <p className="mt-auto text-center text-sm text-muted-foreground tabular-nums">{responses}</p>;
  }

  return (
    <div className="mt-auto flex items-center justify-between gap-3">
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={t("previous")}
        disabled={index === 0}
        onClick={() => onChange(index - 1)}
        className="rounded-lg border-card-border"
      >
        <ChevronLeftIcon aria-hidden />
      </Button>
      <p className="text-center text-sm text-muted-foreground tabular-nums">
        {t("questionOf", { current: index + 1, total: count })} <span aria-hidden>·</span> {responses}
      </p>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={t("next")}
        disabled={index === count - 1}
        onClick={() => onChange(index + 1)}
        className="rounded-lg border-card-border"
      >
        <ChevronRightIcon aria-hidden />
      </Button>
    </div>
  );
}

interface SurveyResultsProps {
  category: SurveyCategory;
  metrics: SurveyMetrics;
}

export function SurveyResults({ category, metrics }: SurveyResultsProps) {
  const t = useTranslations("results");
  const format = useFormatter();
  const [storedIndex, setIndex] = useState(0);
  const count = metrics.questions.length;
  // A new range can bring fewer questions than the stored index
  const index = Math.max(0, Math.min(storedIndex, count - 1));
  const question = metrics.questions[index];

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowLeft" && index > 0) setIndex(index - 1);
    if (event.key === "ArrowRight" && index < count - 1) setIndex(index + 1);
  }

  return (
    <div onKeyDown={handleKeyDown} className="flex flex-1 flex-col gap-4">
      {question ? (
        <div className="flex flex-col gap-2">
          <div aria-live="polite" className="flex items-baseline justify-between gap-4">
            <h4 className="font-semibold text-foreground">{question.text}</h4>
            {question.average !== null && (
              <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-foreground tabular-nums">
                <StarIcon aria-hidden className="size-3.5 fill-current text-star" />
                {format.number(question.average, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </span>
            )}
          </div>
          <OptionList category={category} question={question} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("noQuestions")}</p>
      )}

      <QuestionPager count={count} index={index} totalResponses={metrics.totalResponses} onChange={setIndex} />
    </div>
  );
}
