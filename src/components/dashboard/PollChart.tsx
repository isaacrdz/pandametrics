import { useTranslations } from "next-intl";
import { sortOptions, useChartLabels } from "@/components/dashboard/charts";
import { MetricBar } from "@/components/dashboard/MetricBar";
import { cn } from "@/lib/utils";
import type { QuestionMetrics } from "@/types/survey";

interface PollChartProps {
  question: QuestionMetrics;
}

export function PollChart({ question }: PollChartProps) {
  const t = useTranslations("common");
  const { getOptionLabel, getBarLabel } = useChartLabels();

  return (
    <ul className="flex flex-col gap-4">
      {sortOptions(question.options).map((option) => (
        <li
          key={option.optionId}
          className={cn("flex flex-col gap-3 rounded-xl bg-accent/60 px-5 py-4", option.archived && "opacity-60")}
        >
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="min-w-0 text-foreground/80">{getOptionLabel(option)}</span>
            <span className="shrink-0 font-semibold text-primary">
              {t("responses", { count: option.count })}
            </span>
          </div>
          <MetricBar
            share={option.share}
            color="var(--primary)"
            label={getBarLabel(option)}
            className="bg-card-border/60"
          />
        </li>
      ))}
    </ul>
  );
}
