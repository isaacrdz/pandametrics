"use client";

import { useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { MenuIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { FOCUS_RING, LANDING_LINKS, SECTION_IDS } from "@/components/landing/landing-links";
import { useLandingSignedIn } from "@/components/landing/landing-session";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// Menu below lg: section links, language and account actions in a sheet
export function MobileNav() {
  const t = useTranslations("landing.nav");
  const signedIn = useLandingSignedIn();
  const [open, setOpen] = useState(false);
  // Section picked in the menu, scrolled to once the sheet has closed and released the scroll lock
  const pendingSection = useRef<string | null>(null);

  const sections = [
    { id: SECTION_IDS.features, label: t("features") },
    { id: SECTION_IDS.howItWorks, label: t("howItWorks") },
  ];

  function handleSectionClick(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    pendingSection.current = id;
    setOpen(false);
  }

  function handleCloseAutoFocus() {
    // Focus goes back to the menu button (Radix default), then the page scrolls to the section
    const id = pendingSection.current;
    pendingSection.current = null;
    if (!id) return;
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView();
      history.replaceState(null, "", `#${id}`);
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label={t("menu")}
          className={cn("size-11 rounded-xl bg-card shadow-xs lg:hidden", FOCUS_RING)}
        >
          <MenuIcon aria-hidden className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent aria-describedby={undefined} onCloseAutoFocus={handleCloseAutoFocus} className="gap-6 bg-background">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle className="text-lg font-semibold">{t("menuTitle")}</SheetTitle>
        </SheetHeader>

        {/* From md the header already shows the section links */}
        <nav aria-label={t("label")} className="px-4 md:hidden">
          <ul className="flex flex-col gap-1 text-base">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  onClick={(event) => handleSectionClick(event, section.id)}
                  className={cn("flex h-12 items-center rounded-xl px-3 font-medium text-foreground hover:bg-accent", FOCUS_RING)}
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="px-6">
          <LanguageSwitcher fullWidth />
        </div>

        <div className="mt-auto flex flex-col gap-3 border-t border-card-border p-6">
          {signedIn ? (
            <Button asChild className={cn("h-12 rounded-xl text-base font-semibold", FOCUS_RING)}>
              <Link href={LANDING_LINKS.dashboard} onClick={() => setOpen(false)}>
                {t("goToDashboard")}
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="outline" className={cn("h-12 rounded-xl border-card-border bg-card text-base font-semibold text-primary hover:bg-accent hover:text-primary", FOCUS_RING)}>
                <Link href={LANDING_LINKS.signIn} onClick={() => setOpen(false)}>
                  {t("signIn")}
                </Link>
              </Button>
              <Button asChild className={cn("h-12 rounded-xl text-base font-semibold", FOCUS_RING)}>
                <Link href={LANDING_LINKS.signUp} onClick={() => setOpen(false)}>
                  {t("signUp")}
                </Link>
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
