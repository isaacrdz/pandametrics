import type { PlanTier } from "@/lib/plans/plan";

// Plan and membership limits (context/project-overview.md, "Plans and limits"). Shared by the
// client (messages) and the services (checks)

export interface PlanLimits {
  // Active surveys per organization (its owner's plan)
  activeSurveys: number;
  // Invited members besides the owner (docs/subscriptions.md phase 4)
  invites: number;
}

export const PLAN_LIMITS = {
  FREE: { activeSurveys: 1, invites: 0 },
  PRO: { activeSurveys: 5, invites: 3 },
} as const satisfies Record<string, PlanLimits>;

// An expired plan has the Free limits until it is renewed
export function limitsFor(tier: PlanTier): PlanLimits {
  return tier === "PRO" ? PLAN_LIMITS.PRO : PLAN_LIMITS.FREE;
}

// Business plan members besides the owner
export const BUSINESS_SEATS = 3;

// Organizations a user can belong to, counting the one they own
export const MAX_MEMBERSHIPS = 10;
