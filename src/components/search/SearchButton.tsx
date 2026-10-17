"use client";

import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCommandPalette } from "@/components/search/CommandPaletteProvider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsApplePlatform } from "@/hooks/use-is-apple-platform";

// Opens the command palette from the top bar. Looks like a search field when the bar has room
// (from @2xl, growing at @3xl and @4xl), an icon button with a tooltip otherwise. The shortcut hint
// appears once the platform is known (⌘K on Apple, Ctrl K elsewhere), so the server and the first
// render agree
export function SearchButton() {
  const t = useTranslations("search");
  const { openPalette } = useCommandPalette();
  const isApple = useIsApplePlatform();
  const shortcut = isApple === null ? null : isApple ? t("shortcutMac") : t("shortcutOther");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          onClick={openPalette}
          aria-label={t("triggerLabel")}
          aria-keyshortcuts={isApple ? "Meta+K" : "Control+K"}
          className="h-11 gap-2 rounded-full bg-card px-3 text-[0.95rem] font-normal text-muted-foreground shadow-xs @2xl:w-56 @2xl:justify-start @2xl:px-4 @3xl:w-64 @4xl:w-80"
        >
          <SearchIcon aria-hidden />
          <span className="hidden @2xl:inline">{t("trigger")}</span>
          {shortcut && (
            <kbd className="ml-auto hidden rounded-md border bg-muted px-1.5 py-0.5 font-sans text-xs font-medium @2xl:inline">
              {shortcut}
            </kbd>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{shortcut ? `${t("triggerLabel")} · ${shortcut}` : t("triggerLabel")}</TooltipContent>
    </Tooltip>
  );
}
