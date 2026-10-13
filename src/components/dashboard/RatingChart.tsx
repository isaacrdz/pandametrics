import { useFormatter } from "next-intl";
import { sortOptions, useChartLabels } from "@/components/dashboard/charts";
import { MetricBar } from "@/components/dashboard/MetricBar";
import { StarRow } from "@/components/surveys/StarRow";
import { cn } from "@/lib/utils";
import type { QuestionMetrics } from "@/types/survey";

interface RatingChartProps {
  question: QuestionMetrics;
}

export function RatingChart({ question }: RatingChartProps) {
  const format = useFormatter();
  const { getOptionLabel, getBarLabel } = useChartLabels();

  return (
    <ul className="flex flex-col gap-3.5">
      {sortOptions(question.options).map((option) => (
        <li
          key={option.optionId}
          className={cn(
            "grid grid-cols-[6.5rem_1fr_auto] items-center gap-4 text-sm sm:grid-cols-[8rem_1fr_auto]",
            option.archived && "opacity-60",
          )}
        >
          {option.archived ? (
            <span className="truncate text-muted-foreground">{getOptionLabel(option)}</span>
          ) : (
            <StarRow filled={Number(option.value)} />
          )}
          <MetricBar share={option.share} color="var(--star)" label={getBarLabel(option)} />
          <span className="min-w-8 text-right text-muted-foreground tabular-nums">
            {format.number(option.count)}
          </span>
        </li>
      ))}
    </ul>
  );
}
