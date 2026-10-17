"use client";

import Link from "next/link";
import { ArrowRightIcon, CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { HeroSurveyPreview } from "@/components/landing/HeroSurveyPreview";
import { FOCUS_RING, LANDING_LINKS, SECTION_IDS } from "@/components/landing/landing-links";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Hero() {
  const t = useTranslations("landing.hero");

  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-12 pb-20 md:px-8 lg:grid-cols-2 lg:gap-16 lg:pt-20 lg:pb-28">
      <div className="flex flex-col items-start gap-7">
        <span className="inline-flex items-center gap-2 rounded-full border border-card-border bg-card px-4 py-1.5 text-sm font-semibold text-primary shadow-xs">
          <span aria-hidden className="size-2 rounded-full bg-success" />
          {t("badge")}
        </span>

        <h1 className="text-[2.75rem] leading-[1.05] font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          {t("title")}
        </h1>

        <p className="max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">{t("subtitle")}</p>

        <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:gap-4">
          <Button asChild className={cn("h-14 w-full gap-2 rounded-2xl px-7 text-base font-semibold md:w-auto", FOCUS_RING)}>
            <Link href={LANDING_LINKS.start}>
              {t("primaryCta")}
              <ArrowRightIcon aria-hidden className="size-5" />
            </Link>
          </Button>
          <Button asChild variant="outline" className={cn("h-14 w-full rounded-2xl border-card-border bg-card px-7 text-base font-semibold text-primary hover:bg-accent hover:text-primary md:w-auto", FOCUS_RING)}>
            <a href={`#${SECTION_IDS.features}`}>{t("secondaryCta")}</a>
          </Button>
        </div>

        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground">
          {[t("noCard"), t("quickSetup")].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <CheckIcon aria-hidden className="size-5 text-success-foreground" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <HeroSurveyPreview />
    </section>
  );
}
