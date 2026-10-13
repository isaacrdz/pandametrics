import { useTranslations } from "next-intl";
import type { OptionMetrics } from "@/types/survey";

// Archived options with answers go last so they never disappear silently
export function sortOptions(options: OptionMetrics[]): OptionMetrics[] {
  return [...options].sort((a, b) => Number(a.archived) - Number(b.archived));
}

export function useChartLabels() {
  const t = useTranslations("charts");

  function getOptionLabel(option: OptionMetrics): string {
    return option.archived ? t("archived", { label: option.label }) : option.label;
  }

  function getBarLabel(option: OptionMetrics): string {
    return t("barLabel", { label: getOptionLabel(option), count: option.count, share: option.share });
  }

  return { getOptionLabel, getBarLabel };
}
