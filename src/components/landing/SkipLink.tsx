"use client";

import { useTranslations } from "next-intl";
import { FOCUS_RING } from "@/components/landing/landing-links";
import { cn } from "@/lib/utils";

// First focusable element of the landing: hidden until focused, jumps over the nav
export function SkipLink() {
  const t = useTranslations("landing");

  return (
    <a
      href="#content"
      className={cn(
        "sr-only rounded-xl bg-card font-semibold text-primary shadow-lg focus:not-sr-only focus:fixed focus:px-4 focus:py-3 focus:top-4 focus:left-4 focus:z-50",
        FOCUS_RING,
      )}
    >
      {t("skipToContent")}
    </a>
  );
}
