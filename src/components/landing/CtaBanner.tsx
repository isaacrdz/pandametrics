"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { LANDING_LINKS } from "@/components/landing/landing-links";
import { Button } from "@/components/ui/button";

export function CtaBanner() {
  const t = useTranslations("landing.cta");

  return (
    <section aria-labelledby="cta-title" className="border-t border-card-border bg-accent/40 py-20 lg:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-8">
        <div className="flex flex-col gap-8 rounded-[2rem] bg-inverse p-8 text-inverse-foreground ring-1 ring-card-border sm:p-12 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold tracking-[0.18em] text-brand uppercase">{t("eyebrow")}</p>
            <h2 id="cta-title" className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {t("title")}
            </h2>
          </div>
          <Button
            asChild
            className="h-12 w-fit shrink-0 gap-2 rounded-xl bg-card px-6 text-base font-semibold text-primary hover:bg-accent"
          >
            <Link href={LANDING_LINKS.signUp}>
              {t("button")}
              <ArrowRightIcon aria-hidden className="size-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
