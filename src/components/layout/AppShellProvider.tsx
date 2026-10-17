"use client";

import { createContext, useContext, type ReactNode } from "react";
import { PLAN_LIMITS, type PlanLimits } from "@/lib/plans/limits";
import type { PlanState } from "@/lib/plans/plan";
import type { Organization } from "@/types/survey";

// Global data every page's top bar needs. The layout provides it, so pages render their own
// AppTopBar without passing the session around.
export interface AppShellValue {
  userId: string;
  userName: string | null;
  organizations: Organization[];
  // null without an organization yet (/profile on the way to /welcome): no switcher
  currentOrganizationId: string | null;
  // false: the switcher offers "Create organization"
  ownsOrganization: boolean;
  // The user's own plan (badge, expired notice)
  plan: PlanState;
  // The active organization owner's plan and the limits it gives (Free limits without one)
  organizationPlan: PlanState | null;
  limits: PlanLimits;
}

const AppShellContext = createContext<AppShellValue | null>(null);

export function AppShellProvider({ value, children }: { value: AppShellValue; children: ReactNode }) {
  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

// Parameters of the ACTIVE_LIMIT message: the organization's limit, its plan and Pro's limit
export function useActiveLimitParams() {
  const { organizationPlan, limits } = useAppShell();
  return { limit: limits.activeSurveys, tier: organizationPlan?.tier ?? "FREE", proLimit: PLAN_LIMITS.PRO.activeSurveys };
}

export function useAppShell(): AppShellValue {
  const value = useContext(AppShellContext);
  if (!value) throw new Error("useAppShell must be used inside AppShellProvider");
  return value;
}
