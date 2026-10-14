"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/brand/Logo";
import { LANDING_LINKS, SECTION_IDS } from "@/components/landing/landing-links";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Button } from "@/components/ui/button";

export function LandingNav() {
  const t = useTranslations("landing.nav");

  return (
    <header className="sticky top-0 z-30 border-b border-transparent bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center gap-6 px-4 md:px-8">
        <Logo href="/" size="md" />

        <nav aria-label={t("label")} className="mx-auto hidden md:block">
          <ul className="flex items-center gap-8 text-[0.95rem] text-muted-foreground">
            <li>
              <a href={`#${SECTION_IDS.features}`} className="rounded-md hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                {t("features")}
              </a>
            </li>
            <li>
              <a href={`#${SECTION_IDS.howItWorks}`} className="rounded-md hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                {t("howItWorks")}
              </a>
            </li>
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3 md:ml-0">
          <LanguageSwitcher />
          <Button asChild variant="ghost" className="hidden h-11 rounded-xl px-4 font-semibold text-primary hover:bg-accent hover:text-primary sm:inline-flex">
            <Link href={LANDING_LINKS.signIn}>{t("signIn")}</Link>
          </Button>
          <Button asChild className="h-11 rounded-xl px-4 font-semibold shadow-[0_10px_24px_-12px_var(--primary)] sm:px-5">
            <Link href={LANDING_LINKS.signUp}>{t("signUp")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
