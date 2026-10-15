"use client";

import type { ReactNode } from "react";
import { useAppShell } from "@/components/layout/AppShellProvider";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { OrganizationSwitcher } from "@/components/layout/OrganizationSwitcher";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface AppTopBarProps {
  // Left side: the dashboard greeting, or the page's PageHeading (its h1) on every other view
  heading: ReactNode;
  // Right side, after the global switchers: the view's primary action
  actions?: ReactNode;
}

// The page header of every admin view. Each page renders it first, outside its max-w container.
// A container: with the sidebar open the bar is much narrower than the viewport, so the buttons
// only show their labels when the bar itself has room for them and the heading.
export function AppTopBar({ heading, actions }: AppTopBarProps) {
  const { organizations, currentOrganizationId } = useAppShell();

  return (
    <header className="@container sticky top-0 z-20 flex h-20 shrink-0 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur md:px-8">
      <SidebarTrigger className="md:hidden" />
      <div className="flex min-w-0 flex-1 items-center">{heading}</div>
      <div className="flex shrink-0 items-center gap-2 @3xl:gap-3">
        <OrganizationSwitcher organizations={organizations} currentId={currentOrganizationId} />
        <LanguageSwitcher />
        {actions}
      </div>
    </header>
  );
}
