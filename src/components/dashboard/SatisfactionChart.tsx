import type { CSSProperties } from "react";
import { useFormatter } from "next-intl";
import { sortOptions, useChartLabels } from "@/components/dashboard/charts";
import { MetricBar } from "@/components/dashboard/MetricBar";
import { ReactionFace } from "@/components/surveys/ReactionFace";
import { cn } from "@/lib/utils";
import type { QuestionMetrics, ReactionValue } from "@/types/survey";

interface SatisfactionChartProps {
  question: QuestionMetrics;
}

export function SatisfactionChart({ question }: SatisfactionChartProps) {
  const format = useFormatter();
  const { getOptionLabel, getBarLabel } = useChartLabels();
  const options = sortOptions(question.options);
  const faces = options.filter((option) => !option.archived);

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-wrap justify-center gap-2 sm:gap-3">
        {faces.map((option) => (
          <li key={option.optionId} className="flex w-14 flex-col items-center gap-2 sm:w-16">
            <ReactionFace value={option.value as ReactionValue} color={option.color} />
            <span className="text-center text-xs text-muted-foreground sm:text-sm">{option.label}</span>
          </li>
        ))}
      </ul>
      <ul className="flex flex-col gap-3">
        {options.map((option) => (
          <li
            key={option.optionId}
            className={cn(
              "grid grid-cols-[minmax(0,8.5rem)_1fr_auto] items-center gap-3 text-sm",
              option.archived && "opacity-60",
            )}
          >
            <span className="flex min-w-0 items-center gap-2.5 text-muted-foreground">
              <span
                aria-hidden
                style={{ "--dot-color": option.color } as CSSProperties}
                className="size-2.5 shrink-0 rounded-full bg-(--dot-color)"
              />
              <span className="truncate">{getOptionLabel(option)}</span>
            </span>
            <MetricBar share={option.share} color={option.color} label={getBarLabel(option)} />
            <span className="min-w-8 text-right text-muted-foreground tabular-nums">
              {format.number(option.count)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
