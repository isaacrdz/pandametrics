"use client";

import { Maximize2Icon, Minimize2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { enterFullscreen, exitFullscreen, useFullscreenSupported, useIsFullscreen } from "@/lib/kiosk/fullscreen";

export function FullscreenToggle() {
  const t = useTranslations("kiosk.runner");
  const supported = useFullscreenSupported();
  const active = useIsFullscreen();

  // iPhone Safari has no element fullscreen: nothing to toggle
  if (!supported) return null;

  const label = active ? t("exitFullscreen") : t("fullscreen");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={label}
          onClick={active ? exitFullscreen : enterFullscreen}
          className="size-11 rounded-full bg-card shadow-xs"
        >
          {active ? <Minimize2Icon aria-hidden /> : <Maximize2Icon aria-hidden />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
