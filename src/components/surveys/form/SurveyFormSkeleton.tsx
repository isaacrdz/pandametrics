"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

function SectionSkeleton({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-6 rounded-3xl border border-card-border bg-card p-5 sm:p-8">
      <div className="flex gap-4">
        <Skeleton className="size-12 rounded-xl" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function SurveyFormSkeleton() {
  const t = useTranslations("common");

  return (
    <div role="status" aria-label={t("loading")} className="flex flex-col gap-8">
      <div className="flex justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="hidden h-11 w-72 rounded-xl sm:block" />
      </div>
      <SectionSkeleton rows={3} />
      <SectionSkeleton rows={1} />
    </div>
  );
}
