import { useFormatter } from "next-intl";
import { sortOptionsForList, useOptionLabel } from "@/components/dashboard/charts";
import { ReactionFace } from "@/components/surveys/ReactionFace";
import { StarRow } from "@/components/surveys/StarRow";
import { cn } from "@/lib/utils";
import type { OptionMetrics, QuestionMetrics, ReactionValue, SurveyCategory } from "@/types/survey";

// Icon column (if any) + label + count + percentage
const ROW_COLUMNS: Record<SurveyCategory, string> = {
  SATISFACTION: "grid-cols-[1.75rem_minmax(0,1fr)_auto_3rem]",
  RATING: "grid-cols-[5.5rem_minmax(0,1fr)_auto_3rem]",
  POLL: "grid-cols-[minmax(0,1fr)_auto_3rem]",
};

function OptionIcon({ category, option }: { category: SurveyCategory; option: OptionMetrics }) {
  if (category === "SATISFACTION") {
    return <ReactionFace value={option.value as ReactionValue} color={option.color} size="sm" />;
  }
  // Archived rating options show their label instead of stars
  if (category === "RATING" && !option.archived) {
    return <StarRow filled={Number(option.value)} className="[&_svg]:size-3.5" />;
  }
  return category === "RATING" ? <span aria-hidden /> : null;
}

interface OptionListProps {
  category: SurveyCategory;
  question: QuestionMetrics;
}

export function OptionList({ category, question }: OptionListProps) {
  const format = useFormatter();
  const getOptionLabel = useOptionLabel();

  return (
    <ul className="divide-y divide-card-border">
      {sortOptionsForList(category, question.options).map((option) => {
        // Rating options are described by their stars; only archived ones need a label
        const showLabel = category !== "RATING" || option.archived;

        return (
          <li
            key={option.optionId}
            className={cn(
              "grid items-center gap-3 py-2.5 text-sm",
              ROW_COLUMNS[category],
              option.archived && "opacity-60",
            )}
          >
            <OptionIcon category={category} option={option} />
            <span
              className={cn(
                "min-w-0 text-foreground",
                category === "POLL" ? "line-clamp-2" : "truncate",
              )}
            >
              {showLabel && getOptionLabel(option)}
            </span>
            <span className="text-right font-semibold text-foreground tabular-nums">
              {format.number(option.count)}
            </span>
            <span className="text-right text-xs text-muted-foreground tabular-nums">
              {format.number(option.share, { style: "percent", maximumFractionDigits: 0 })}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
