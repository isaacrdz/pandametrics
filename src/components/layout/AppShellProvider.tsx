"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Organization } from "@/types/survey";

// Global data every page's top bar needs. The layout provides it, so pages render their own
// AppTopBar without passing the session around.
export interface AppShellValue {
  userName: string | null;
  organizations: Organization[];
  // null without an organization yet (/profile on the way to /welcome): no switcher
  currentOrganizationId: string | null;
  // false: the switcher offers "Create organization"
  ownsOrganization: boolean;
}

const AppShellContext = createContext<AppShellValue | null>(null);

export function AppShellProvider({ value, children }: { value: AppShellValue; children: ReactNode }) {
  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

export function useAppShell(): AppShellValue {
  const value = useContext(AppShellContext);
  if (!value) throw new Error("useAppShell must be used inside AppShellProvider");
  return value;
}
