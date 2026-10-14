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
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { RangeKey } from "@/lib/date-range";
import type { SurveyRow } from "@/lib/surveys/list";

const HEAD_CLASS = "h-12 px-4 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase";

interface SurveysTableProps {
  rows: SurveyRow[];
  now: string;
  range: RangeKey;
}

// Card at least 42rem wide (@2xl). Below 56rem (@4xl) the Type column moves under the name.
export function SurveysTable({ rows, now, range }: SurveysTableProps) {
  const t = useTranslations("surveys");
  const tRange = useTranslations("dateRange");

  return (
    <Table className="text-[0.95rem]">
      <TableCaption className="sr-only">{t("caption")}</TableCaption>
      <TableHeader>
        <TableRow className="border-card-border hover:bg-transparent">
          <TableHead scope="col" className={`${HEAD_CLASS} pl-6`}>
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
          <TableHead scope="col" className={`${HEAD_CLASS} pr-6`}>
            {t("columns.updated")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} className="border-card-border hover:bg-accent/40">
            <th scope="row" className="w-[42%] max-w-0 py-4 pr-4 pl-6 text-left font-normal @4xl:w-[36%]">
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
            <TableCell className="py-4 pr-6 pl-4 text-muted-foreground">
              <SurveyUpdatedAt updatedAt={row.updatedAt} now={now} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
