"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import pandaHero from "@/assets/brand/panda-hero.webp";
import { cn } from "@/lib/utils";

// Illustrative numbers, not the mock data: the landing does not depend on the survey store
const STAT_COUNT = 2486;
const STAT_GROWTH = 0.184;
const BAR_HEIGHTS = [22, 34, 28, 46, 38, 52, 44, 62, 58, 74];

export function HeroVisual() {
  const t = useTranslations("landing.hero");
  const format = useFormatter();
  // Formatted once so the visible card and its accessible description show the same values
  const count = format.number(STAT_COUNT);
  const growth = format.number(STAT_GROWTH, { style: "percent", maximumFractionDigits: 1 });

  return (
    <div className="rounded-[2rem] bg-card p-3 shadow-[0_40px_80px_-40px_color-mix(in_oklch,var(--brand)_70%,transparent)] ring-1 ring-card-border sm:p-4">
      {/* Bottom padding leaves room for the stat card so it covers the hoodie, not the face */}
      <div className="relative overflow-hidden rounded-[1.6rem] bg-brand pb-32">
        <Image
          src={pandaHero}
          alt=""
          fetchPriority="high"
          loading="eager"
          sizes="(min-width: 1024px) 480px, 90vw"
          placeholder="blur"
          className="-mt-[16%] h-auto w-full"
        />
        <div
          role="img"
          aria-label={t("statDescription", { count, growth })}
          className="absolute inset-x-4 bottom-4 rounded-2xl bg-card/95 p-4 shadow-xl backdrop-blur sm:inset-x-8 sm:bottom-8 sm:p-5"
        >
          <div aria-hidden className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{t("statLabel")}</p>
              <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">{count}</p>
            </div>
            <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success-foreground">
              {format.number(STAT_GROWTH, { style: "percent", maximumFractionDigits: 1, signDisplay: "always" })}
            </span>
          </div>
          <div aria-hidden className="mt-3 flex h-10 items-end gap-1.5">
            {BAR_HEIGHTS.map((height, index) => (
              <span
                key={index}
                className={cn("h-(--bar-height) flex-1 rounded-t-md", index === BAR_HEIGHTS.length - 1 ? "bg-brand" : "bg-brand/40")}
                style={{ "--bar-height": `${height}%` } as CSSProperties}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
