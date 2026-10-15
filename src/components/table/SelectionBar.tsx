"use client";

import type { ReactNode } from "react";
import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export const BAR_BUTTON_CLASS =
  "h-11 flex-1 gap-2 rounded-xl px-3.5 text-[0.95rem] font-medium @2xl:flex-none [&_svg:not([class*='size-'])]:size-4";

interface SelectionBarProps {
  // Accessible name of the group, e.g. "Selected surveys"
  label: string;
  // "3 selected", worded by each list (Spanish agrees in gender with the noun)
  countLabel: string;
  disabled: boolean;
  onClear: () => void;
  // The bulk action buttons (and their dialogs)
  children: ReactNode;
}

// Replaces the filters while rows are selected.
// Same order on screen and in the DOM: count, actions, clear. Narrow cards put the count on its
// own line and let the actions wrap; wide cards keep one line. The count is announced by the
// section's live region, which stays mounted.
export function SelectionBar({ label, countLabel, disabled, onClear, children }: SelectionBarProps) {
  const t = useTranslations("table");

  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2 @2xl:flex-nowrap">
      <p className="basis-full text-sm font-semibold whitespace-nowrap text-foreground tabular-nums @2xl:mr-1 @2xl:basis-auto">
        {countLabel}
      </p>
      {children}
      <Button
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={onClear}
        aria-label={t("clearSelection")}
        className="size-11 shrink-0 rounded-xl text-muted-foreground"
      >
        <XIcon aria-hidden />
      </Button>
    </div>
  );
}
