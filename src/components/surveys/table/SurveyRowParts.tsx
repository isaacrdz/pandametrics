"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { TIME_ZONE } from "@/i18n/config";
import { getDayOffset } from "@/lib/format";
import { SURVEY_DOT_COLORS } from "@/lib/surveys/colors";
import type { SurveyRow } from "@/lib/surveys/list";
import { cn } from "@/lib/utils";
import type { SurveyCategory } from "@/types/survey";

// Placeholder for "no responses", the same in every language
const EMPTY_VALUE = "—";

// Cell contents shared by the table (md and up) and the stacked list (below md)

export function SurveyDot({ colorIndex }: { colorIndex: number }) {
  return (
    <span
      aria-hidden
      className="size-2 shrink-0 rounded-full bg-(--dot-color)"
      style={{ "--dot-color": SURVEY_DOT_COLORS[colorIndex] } as CSSProperties}
    />
  );
}

export function SurveyName({ row, className }: { row: SurveyRow; className?: string }) {
  return (
    <span className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <Link
        href={`/surveys/${row.id}`}
        title={row.name}
        className="truncate rounded-sm font-semibold text-foreground outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      >
        {row.name}
      </Link>
      <span className="font-mono text-xs tracking-wider whitespace-nowrap text-muted-foreground uppercase">{row.code}</span>
    </span>
  );
}

export function SurveyTypeBadge({ category }: { category: SurveyCategory }) {
  const t = useTranslations("categories");

  return (
    <span className="inline-flex w-fit items-center rounded-md bg-accent px-2 py-0.5 text-xs font-medium whitespace-nowrap text-primary">
      {t(`${category}.title`)}
    </span>
  );
}

// Active: success-foreground on success/10 over the card measures 4.74:1 light, 8.0:1 dark
// (alpha mixes are not read by check-contrast.mjs). Draft uses the checked muted pair.
export function SurveyStatusPill({ isActive }: { isActive: boolean }) {
  const t = useTranslations("surveys.status");

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        isActive ? "bg-success/10 text-success-foreground" : "bg-muted text-muted-foreground",
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", isActive ? "bg-success" : "bg-muted-foreground/60")} />
      {t(isActive ? "ACTIVE" : "DRAFT")}
    </span>
  );
}

export function SurveyResponses({ count }: { count: number }) {
  const t = useTranslations("surveys");
  const format = useFormatter();

  if (count === 0) {
    return (
      <span role="img" aria-label={t("noResponses")} className="text-muted-foreground">
        {EMPTY_VALUE}
      </span>
    );
  }
  return <span className="font-semibold text-foreground tabular-nums">{format.number(count)}</span>;
}

export function SurveyUpdatedAt({ updatedAt, now }: { updatedAt: string; now: string }) {
  const t = useTranslations("surveys.updated");
  const format = useFormatter();
  const date = new Date(updatedAt);
  const offset = getDayOffset(date, new Date(now), TIME_ZONE);
  const time = format.dateTime(date, { hour: "numeric", minute: "2-digit" });

  let text: string;
  if (offset === 0) text = t("today", { time });
  else if (offset === 1) text = t("yesterday", { time });
  else text = format.dateTime(date, { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

  return <time dateTime={updatedAt}>{text}</time>;
}
