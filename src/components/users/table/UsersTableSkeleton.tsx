"use client";

import { useTranslations } from "next-intl";
import { TablePaginationSkeleton, TableToolbarSkeleton } from "@/components/table/TableSkeletonParts";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_PAGE_SIZE } from "@/lib/table/pagination";

// Same as the default page size, so the first render does not jump
const ROWS = DEFAULT_PAGE_SIZE;

export function UsersTableSkeleton() {
  const t = useTranslations("users");

  return (
    <div role="status" aria-label={t("loading")} className="flex flex-col gap-6">
      <div className="@container overflow-hidden rounded-3xl border border-card-border bg-card">
        <TableToolbarSkeleton filters={1} />
        <div className="hidden h-12 items-center gap-6 border-b border-card-border px-6 @2xl:flex">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="ml-auto h-3 w-16" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>
        {/* Wide cards: table rows */}
        {Array.from({ length: ROWS }, (_, i) => (
          <div key={`row-${i}`} className="hidden h-[77px] items-center gap-4 border-b border-card-border px-6 @2xl:flex">
            <Skeleton className="size-4.5 rounded-[5px]" />
            <Skeleton className="size-9 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-40 max-w-full" />
              <Skeleton className="h-3 w-32 max-w-full" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="hidden h-4 w-28 @3xl:block" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="size-6 rounded-md" />
          </div>
        ))}
        {/* Narrow cards: stacked list items */}
        {Array.from({ length: ROWS }, (_, i) => (
          <div key={`item-${i}`} className="flex flex-col gap-3 border-b border-card-border py-4 pr-3 pl-5 @2xl:hidden">
            <div className="flex items-center gap-3">
              <Skeleton className="size-4.5 rounded-[5px]" />
              <Skeleton className="size-9 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-5 w-36 max-w-full" />
                <Skeleton className="h-4 w-28 max-w-full" />
              </div>
              <Skeleton className="size-6 rounded-md" />
            </div>
            <div className="flex items-center gap-2 pl-[4.875rem]">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="ml-auto h-4 w-24" />
            </div>
            <Skeleton className="ml-[4.875rem] h-5 w-48 max-w-[55%]" />
          </div>
        ))}
        <TablePaginationSkeleton />
      </div>
    </div>
  );
}
