"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

function SurveyCardSkeleton() {
  return (
    <div className="flex flex-col gap-5 rounded-3xl border border-card-border bg-card p-5 sm:p-6">
      <div className="flex justify-between gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        <Skeleton className="size-9 rounded-xl" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-2/3" />
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="size-7 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-10" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="size-8 rounded-lg" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="size-8 rounded-lg" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  const t = useTranslations("common");

  return (
    // Same container and thresholds as DashboardSection, so nothing jumps when the content arrives
    <div role="status" aria-label={t("loading")} className="@container/surveys flex flex-col gap-6">
      <div className="flex flex-col gap-4 @3xl/surveys:flex-row @3xl/surveys:items-end @3xl/surveys:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-11 w-full rounded-full @md/surveys:w-48" />
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <SurveyCardSkeleton />
        <SurveyCardSkeleton />
      </div>
    </div>
  );
}
