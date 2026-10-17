"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/brand/Logo";
import { FOCUS_RING, LANDING_LINKS, SECTION_IDS } from "@/components/landing/landing-links";
import { useLandingSignedIn } from "@/components/landing/landing-session";
import { MobileNav } from "@/components/landing/MobileNav";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LandingNav() {
  const t = useTranslations("landing.nav");
  const signedIn = useLandingSignedIn();

  return (
    <header className="sticky top-0 z-30 border-b border-transparent bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center gap-6 px-4 md:px-8">
        <Logo href="/" size="md" className={FOCUS_RING} />

        <nav aria-label={t("label")} className="mx-auto hidden md:block">
          <ul className="flex items-center gap-8 text-[0.95rem] text-muted-foreground">
            <li>
              <a href={`#${SECTION_IDS.features}`} className={cn("rounded-md whitespace-nowrap hover:text-foreground", FOCUS_RING)}>
                {t("features")}
              </a>
            </li>
            <li>
              <a href={`#${SECTION_IDS.howItWorks}`} className={cn("rounded-md whitespace-nowrap hover:text-foreground", FOCUS_RING)}>
                {t("howItWorks")}
              </a>
            </li>
          </ul>
        </nav>

        {/* Below lg the menu sheet holds the language and the account actions (and the links below md):
            at tablet width they do not fit next to the full wordmark */}
        <div className="ml-auto flex items-center gap-3 lg:ml-0">
          <div className="hidden items-center gap-3 lg:flex">
            <LanguageSwitcher />
            {!signedIn && (
              <Button asChild variant="ghost" className={cn("h-11 rounded-xl px-4 font-semibold text-primary hover:bg-accent hover:text-primary", FOCUS_RING)}>
                <Link href={LANDING_LINKS.signIn}>{t("signIn")}</Link>
              </Button>
            )}
            <Button asChild className={cn("h-11 rounded-xl px-5 font-semibold shadow-[0_10px_24px_-12px_var(--primary)]", FOCUS_RING)}>
              {signedIn ? (
                <Link href={LANDING_LINKS.dashboard}>{t("goToDashboard")}</Link>
              ) : (
                <Link href={LANDING_LINKS.signUp}>{t("signUp")}</Link>
              )}
            </Button>
          </div>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
