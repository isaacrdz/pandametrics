import { useTranslations } from "next-intl";
import { REACTION_VALUES } from "@/lib/surveys/constants";
import type { OptionMetrics, ReactionValue, SurveyCategory } from "@/types/survey";

// Higher is better; null keeps the stored order (poll options)
function getOptionRank(category: SurveyCategory, option: OptionMetrics): number | null {
  if (category === "SATISFACTION") return REACTION_VALUES.indexOf(option.value as ReactionValue);
  if (category === "RATING") return Number(option.value);
  return null;
}

// Best option first; archived options with answers go last so they never disappear silently
export function sortOptionsForList(category: SurveyCategory, options: OptionMetrics[]): OptionMetrics[] {
  return [...options].sort((a, b) => {
    if (a.archived !== b.archived) return Number(a.archived) - Number(b.archived);
    const rankA = getOptionRank(category, a);
    const rankB = getOptionRank(category, b);
    return rankA === null || rankB === null ? 0 : rankB - rankA;
  });
}

export function useOptionLabel() {
  const t = useTranslations("charts");

  return (option: OptionMetrics): string =>
    option.archived ? t("archived", { label: option.label }) : option.label;
}
