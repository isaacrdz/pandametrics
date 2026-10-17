"use client";

import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { SearchButton } from "@/components/search/SearchButton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface AppTopBarProps {
  // Left side: the dashboard greeting, or the page's PageHeading (its h1) on every other view
  heading: ReactNode;
  // Right side, after the language switcher: the view's primary action
  actions?: ReactNode;
  // Forms: on narrow bars (below 36rem) the search button and the language switcher make room for
  // the back button, the title and the save button (they stay on every other view; ⌘K always works)
  hideSwitchersWhenNarrow?: boolean;
}

// The page header of every admin view. Each page renders it first, outside its max-w container.
// A container: with the sidebar open the bar is much narrower than the viewport, so the buttons
// only show their labels when the bar itself has room for them and the heading.
export function AppTopBar({ heading, actions, hideSwitchersWhenNarrow = false }: AppTopBarProps) {
  return (
    <header className="@container sticky top-0 z-20 flex h-20 shrink-0 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur md:px-8">
      <SidebarTrigger className="md:hidden" />
      {/* The heading (greeting or page title) with the search right after it */}
      <div className="flex min-w-0 flex-1 items-center gap-3 @5xl:gap-6">
        <div className="flex min-w-0 items-center">{heading}</div>
        <div className={cn("shrink-0", hideSwitchersWhenNarrow && "hidden @xl:block")}>
          <SearchButton />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 @3xl:gap-3">
        <div className={cn("items-center", hideSwitchersWhenNarrow ? "hidden @xl:flex" : "flex")}>
          <LanguageSwitcher />
        </div>
        {actions}
      </div>
    </header>
  );
}
