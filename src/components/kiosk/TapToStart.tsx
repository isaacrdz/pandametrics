"use client";

import { HandIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { enterFullscreen } from "@/lib/kiosk/fullscreen";

// After a restart that lost fullscreen: browsers only allow fullscreen from a user gesture, so the
// next person's first tap brings it back and starts the survey
export function TapToStart({ onStart }: { onStart: () => void }) {
  const t = useTranslations("kiosk.thanks");

  return (
    <button
      type="button"
      autoFocus
      onClick={() => {
        enterFullscreen();
        onStart();
      }}
      className="fixed inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-background text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset"
    >
      <HandIcon aria-hidden className="size-14 motion-safe:animate-pulse" />
      <span className="text-4xl font-bold tracking-tight sm:text-5xl">{t("tapToStart")}</span>
    </button>
  );
}
