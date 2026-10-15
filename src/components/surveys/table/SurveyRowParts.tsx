"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { StatusPill } from "@/components/table/StatusPill";
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

export function SurveyStatusPill({ isActive }: { isActive: boolean }) {
  const t = useTranslations("surveys.status");
  return <StatusPill tone={isActive ? "success" : "muted"} label={t(isActive ? "ACTIVE" : "DRAFT")} />;
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
