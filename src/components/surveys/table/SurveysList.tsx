"use client";

import { useTranslations } from "next-intl";
import {
  SurveyDot,
  SurveyName,
  SurveyStatusPill,
  SurveyTypeBadge,
  SurveyUpdatedAt,
} from "@/components/surveys/table/SurveyRowParts";
import type { SurveyRow } from "@/lib/surveys/list";

interface SurveysListProps {
  rows: SurveyRow[];
  now: string;
}

// Card narrower than 42rem: a wide table would hide the status behind a horizontal scroll, so rows stack
export function SurveysList({ rows, now }: SurveysListProps) {
  const t = useTranslations("surveys");
  const tCommon = useTranslations("common");

  return (
    <ul aria-label={t("caption")} className="divide-y divide-card-border">
      {rows.map((row) => (
        <li key={row.id} className="flex flex-col gap-3 px-5 py-4">
          <div className="flex items-center gap-3">
            <SurveyDot colorIndex={row.colorIndex} />
            <SurveyName row={row} />
          </div>
          <div className="flex flex-wrap items-center gap-2 pl-5">
            <SurveyTypeBadge category={row.category} />
            <SurveyStatusPill isActive={row.isActive} />
            <span className="ml-auto text-sm text-muted-foreground tabular-nums">
              {row.responses === 0 ? t("noResponses") : tCommon("responses", { count: row.responses })}
            </span>
          </div>
          <p className="flex gap-1.5 pl-5 text-sm text-muted-foreground">
            <span>{t("columns.updated")}</span>
            <span aria-hidden>·</span>
            <SurveyUpdatedAt updatedAt={row.updatedAt} now={now} />
          </p>
        </li>
      ))}
    </ul>
  );
}
