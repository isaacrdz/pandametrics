"use client";

import { useTranslations } from "next-intl";
import { TablePaginationSkeleton, TableToolbarSkeleton } from "@/components/table/TableSkeletonParts";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_PAGE_SIZE } from "@/lib/table/pagination";

// Same as the default page size, so the first render does not jump
const ROWS = DEFAULT_PAGE_SIZE;

export function SurveysTableSkeleton() {
  const t = useTranslations("surveys");

  return (
    <div role="status" aria-label={t("loading")} className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
          {/* The subtitle wraps onto a second line on phones */}
          <Skeleton className="h-4 w-24 sm:hidden" />
        </div>
        <Skeleton className="h-11 w-full rounded-full sm:w-48" />
      </div>
      <div className="@container overflow-hidden rounded-3xl border border-card-border bg-card">
        <TableToolbarSkeleton filters={2} />
        <div className="hidden h-12 items-center gap-6 border-b border-card-border px-6 @2xl:flex">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="ml-auto h-3 w-16" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>
        {/* Wide cards: table rows */}
        {Array.from({ length: ROWS }, (_, i) => (
          <div key={`row-${i}`} className="hidden h-[73px] items-center gap-4 border-b border-card-border px-6 @2xl:flex">
            <Skeleton className="size-4.5 rounded-[5px]" />
            <Skeleton className="size-2 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-40 max-w-full" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="size-6 rounded-md" />
          </div>
        ))}
        {/* Narrow cards: stacked list items (name, badges, date) */}
        {Array.from({ length: ROWS }, (_, i) => (
          <div key={`item-${i}`} className="flex flex-col gap-3 border-b border-card-border py-4 pr-3 pl-5 @2xl:hidden">
            <div className="flex items-center gap-3">
              <Skeleton className="size-4.5 rounded-[5px]" />
              <Skeleton className="size-2 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-5 w-40 max-w-full" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="size-6 rounded-md" />
            </div>
            <div className="flex items-center gap-2 pl-12">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="ml-auto h-4 w-20" />
            </div>
            <Skeleton className="ml-12 h-5 w-48 max-w-[60%]" />
          </div>
        ))}
        <TablePaginationSkeleton />
      </div>
    </div>
  );
}
