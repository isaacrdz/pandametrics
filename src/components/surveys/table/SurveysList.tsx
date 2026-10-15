"use client";

import { useTranslations } from "next-intl";
import {
  SurveyDot,
  SurveyName,
  SurveyStatusPill,
  SurveyTypeBadge,
} from "@/components/surveys/table/SurveyRowParts";
import type { RowControls } from "@/components/surveys/table/row-controls";
import { TableCheckbox } from "@/components/table/TableCheckbox";
import { UpdatedAt } from "@/components/table/UpdatedAt";
import { SurveyActionsMenu } from "@/components/surveys/SurveyActionsMenu";
import type { SurveyRow } from "@/lib/surveys/list";

interface SurveysListProps {
  rows: SurveyRow[];
  now: string;
  controls: RowControls;
}

// Card narrower than 42rem: a wide table would hide the status behind a horizontal scroll, so rows stack
export function SurveysList({ rows, now, controls }: SurveysListProps) {
  const t = useTranslations("surveys");
  const tCommon = useTranslations("common");

  return (
    <ul aria-label={t("caption")} className="divide-y divide-card-border">
      {rows.map((row) => (
        <li
          key={row.id}
          className={`flex flex-col gap-3 py-4 pr-3 pl-5 ${controls.isSelected(row.id) ? "bg-accent/60" : ""}`}
        >
          <div className="flex items-center gap-3">
            <TableCheckbox
              checked={controls.isSelected(row.id)}
              onCheckedChange={(checked) => controls.onToggle(row.id, checked === true)}
              aria-label={t("select.row", { name: row.name })}
            />
            <SurveyDot colorIndex={row.colorIndex} />
            <SurveyName row={row} className="flex-1" />
            <SurveyActionsMenu survey={row} activeCount={controls.activeCount} onDelete={controls.onDelete} />
          </div>
          <div className="flex flex-wrap items-center gap-2 pr-2 pl-12">
            <SurveyTypeBadge category={row.category} />
            <SurveyStatusPill isActive={row.isActive} />
            <span className="ml-auto text-sm text-muted-foreground tabular-nums">
              {row.responses === 0 ? t("noResponses") : tCommon("responses", { count: row.responses })}
            </span>
          </div>
          <p className="flex flex-wrap gap-x-1.5 pl-12 text-sm text-muted-foreground">
            <span>{t("columns.updated")}</span>
            <span aria-hidden>·</span>
            <UpdatedAt updatedAt={row.updatedAt} now={now} />
          </p>
        </li>
      ))}
    </ul>
  );
}
