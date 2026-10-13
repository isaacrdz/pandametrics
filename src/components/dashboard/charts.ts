import { formatPercent, formatResponses } from "@/lib/format";
import type { OptionMetrics } from "@/types/survey";

export const ARCHIVED_SUFFIX = " (eliminada)";

// Archived options with answers go last so they never disappear silently
export function sortOptions(options: OptionMetrics[]): OptionMetrics[] {
  return [...options].sort((a, b) => Number(a.archived) - Number(b.archived));
}

export function getOptionLabel(option: OptionMetrics): string {
  return option.archived ? `${option.label}${ARCHIVED_SUFFIX}` : option.label;
}

export function getBarLabel(option: OptionMetrics): string {
  return `${getOptionLabel(option)}: ${formatResponses(option.count)} (${formatPercent(option.share)})`;
}
