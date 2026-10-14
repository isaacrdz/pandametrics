"use client";

import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Same key as the shortcut built into SidebarProvider
const SHORTCUT = { apple: "⌘B", other: "Ctrl B" };

// Only rendered inside an open tooltip, so reading navigator never runs on the server
function ShortcutHint() {
  const isApple = /Mac|iPhone|iPad/.test(navigator.userAgent);
  return (
    <kbd className="rounded bg-background/20 px-1.5 font-sans text-[0.7rem]">
      {isApple ? SHORTCUT.apple : SHORTCUT.other}
    </kbd>
  );
}

// Collapses the sidebar to its icon rail and expands it back; visible in both states.
// In the mobile sheet it is the only visible close button (the sheet hides its own)
export function SidebarToggle() {
  const t = useTranslations("a11y");
  const { state, toggleSidebar, isMobile, openMobile } = useSidebar();
  const isExpanded = isMobile ? openMobile : state === "expanded";
  const label = isMobile ? t("close") : t(isExpanded ? "collapseSidebar" : "expandSidebar");
  const Icon = isExpanded ? PanelLeftCloseIcon : PanelLeftOpenIcon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          aria-expanded={isExpanded}
          onClick={toggleSidebar}
          className="size-10 shrink-0 rounded-xl text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-5"
        >
          <Icon aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" className="flex items-center gap-2">
        {label}
        {!isMobile && <ShortcutHint />}
      </TooltipContent>
    </Tooltip>
  );
}
