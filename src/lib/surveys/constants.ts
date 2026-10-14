import type { ReactionValue, SurveyCategory } from "@/types/survey";

// Shared by the form (client) and the survey service (server)

export const SURVEY_CATEGORIES = ["SATISFACTION", "RATING", "POLL"] as const satisfies readonly SurveyCategory[];

export const REACTION_VALUES = [
  "VERY_BAD",
  "BAD",
  "GOOD",
  "VERY_GOOD",
  "INCREDIBLE",
] as const satisfies readonly ReactionValue[];

// Overview palette (section 11), the default color of each reaction
export const REACTION_COLORS: Record<ReactionValue, string> = {
  VERY_BAD: "#ef4444",
  BAD: "#f97316",
  GOOD: "#eab308",
  VERY_GOOD: "#84cc16",
  INCREDIBLE: "#22c55e",
};

export const RATING_VALUES = ["1", "2", "3", "4", "5"] as const;

export const RATING_COLOR = "#f59e0b";

export const POLL_FALLBACK_COLORS = ["#7c4dff", "#00acc1", "#8d6e63", "#546e7a", "#ec407a"];

export const ACTIVE_SURVEY_LIMIT = 5;

export const OPTION_LIMITS = {
  SATISFACTION: { min: 1, max: 5 },
  POLL: { min: 2, max: 5 },
} as const;

export const TEXT_LIMITS = {
  name: 120,
  description: 500,
  question: 300,
  reactionLabel: 40,
  pollLabel: 80,
} as const;
