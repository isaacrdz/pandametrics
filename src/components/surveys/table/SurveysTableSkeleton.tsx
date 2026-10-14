"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

const ROWS = 6;

export function SurveysTableSkeleton() {
  const t = useTranslations("surveys");

  return (
    <div role="status" aria-label={t("loading")} className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-11 w-full rounded-full sm:w-48" />
      </div>
      <div className="@container overflow-hidden rounded-3xl border border-card-border bg-card">
        <div className="hidden h-12 items-center gap-6 border-b border-card-border px-6 @2xl:flex">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="ml-auto h-3 w-16" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>
        {Array.from({ length: ROWS }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-card-border px-5 py-5 last:border-0 @2xl:px-6">
            <Skeleton className="size-2 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-40 max-w-full" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="hidden h-4 w-12 @2xl:block" />
            <Skeleton className="hidden h-4 w-32 @2xl:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
