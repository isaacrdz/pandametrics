"use client";

import { useTranslations } from "next-intl";
import { COPYRIGHT_YEAR } from "@/components/landing/landing-links";

export function LandingFooter() {
  const t = useTranslations("landing.footer");

  return (
    <footer className="bg-accent/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 border-t border-card-border px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between md:px-8">
        <p>{t("copyright", { year: COPYRIGHT_YEAR })}</p>
        <p>{t("tagline")}</p>
      </div>
    </footer>
  );
}
