"use client";

import { useTranslations } from "next-intl";
import {
  SurveyDot,
  SurveyName,
  SurveyResponses,
  SurveyStatusPill,
  SurveyTypeBadge,
  SurveyUpdatedAt,
} from "@/components/surveys/table/SurveyRowParts";
import type { RowControls } from "@/components/surveys/table/row-controls";
import { SurveyCheckbox } from "@/components/surveys/table/SurveyCheckbox";
import { SurveyActionsMenu } from "@/components/surveys/SurveyActionsMenu";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { RangeKey } from "@/lib/date-range";
import type { SurveyRow } from "@/lib/surveys/list";

const HEAD_CLASS = "h-12 px-4 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase";

interface SurveysTableProps {
  rows: SurveyRow[];
  now: string;
  range: RangeKey;
  controls: RowControls;
}

// Card at least 42rem wide (@2xl). Below 56rem (@4xl) the Type column moves under the name.
export function SurveysTable({ rows, now, range, controls }: SurveysTableProps) {
  const t = useTranslations("surveys");
  const tRange = useTranslations("dateRange");

  return (
    <Table className="text-[0.95rem]">
      <TableCaption className="sr-only">{t("caption")}</TableCaption>
      <TableHeader>
        <TableRow className="border-card-border hover:bg-transparent">
          <TableHead scope="col" className="w-12 pr-0 pl-6">
            <SurveyCheckbox
              checked={controls.allState}
              onCheckedChange={(checked) => controls.onToggleAll(checked === true)}
              aria-label={t("select.all")}
            />
          </TableHead>
          <TableHead scope="col" className={`${HEAD_CLASS} pl-3`}>
            {t("columns.survey")}
          </TableHead>
          <TableHead scope="col" className={`${HEAD_CLASS} hidden @4xl:table-cell`}>
            {t("columns.type")}
          </TableHead>
          <TableHead scope="col" className={HEAD_CLASS}>
            {t("columns.status")}
          </TableHead>
          <TableHead scope="col" className={`${HEAD_CLASS} text-right`}>
            <span aria-hidden>{t("columns.responses")}</span>
            <span className="sr-only">{t("columns.responsesRange", { range: tRange(range) })}</span>
          </TableHead>
          <TableHead scope="col" className={HEAD_CLASS}>
            {t("columns.updated")}
          </TableHead>
          <TableHead scope="col" className="w-14 pr-4">
            <span className="sr-only">{t("columns.actions")}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.id}
            data-state={controls.isSelected(row.id) ? "selected" : undefined}
            className="border-card-border hover:bg-accent/40 data-[state=selected]:bg-accent/60"
          >
            <TableCell className="w-12 py-4 pr-0 pl-6">
              <SurveyCheckbox
                checked={controls.isSelected(row.id)}
                onCheckedChange={(checked) => controls.onToggle(row.id, checked === true)}
                aria-label={t("select.row", { name: row.name })}
              />
            </TableCell>
            <th scope="row" className="w-[40%] max-w-0 py-4 pr-4 pl-3 text-left font-normal @4xl:w-[34%]">
              <div className="flex items-center gap-3">
                <SurveyDot colorIndex={row.colorIndex} />
                <div className="flex min-w-0 flex-col gap-1.5">
                  <SurveyName row={row} />
                  <span className="@4xl:hidden">
                    <SurveyTypeBadge category={row.category} />
                  </span>
                </div>
              </div>
            </th>
            <TableCell className="hidden px-4 py-4 @4xl:table-cell">
              <SurveyTypeBadge category={row.category} />
            </TableCell>
            <TableCell className="px-4 py-4">
              <SurveyStatusPill isActive={row.isActive} />
            </TableCell>
            <TableCell className="px-4 py-4 text-right">
              <SurveyResponses count={row.responses} />
            </TableCell>
            <TableCell className="px-4 py-4 text-muted-foreground">
              <SurveyUpdatedAt updatedAt={row.updatedAt} now={now} />
            </TableCell>
            <TableCell className="py-4 pr-4 text-right">
              <SurveyActionsMenu survey={row} activeCount={controls.activeCount} onDelete={controls.onDelete} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
