"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

function SectionSkeleton({ fields, columns }: { fields: number; columns: number }) {
  return (
    <div className="flex flex-col gap-6 rounded-3xl border border-card-border bg-card p-5 sm:p-8">
      <div className="flex gap-4">
        <Skeleton className="size-12 rounded-xl" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className={columns === 3 ? "grid gap-3 sm:grid-cols-3" : "grid gap-6 sm:grid-cols-2"}>
        {Array.from({ length: fields }, (_, i) => (
          <Skeleton key={i} className={columns === 3 ? "h-24 rounded-2xl" : "h-12 rounded-xl"} />
        ))}
      </div>
    </div>
  );
}

export function UserFormSkeleton() {
  const t = useTranslations("common");

  return (
    <div role="status" aria-label={t("loading")} className="flex flex-col gap-8">
      <div className="flex justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="hidden h-11 w-64 rounded-xl sm:block" />
      </div>
      <SectionSkeleton fields={3} columns={2} />
      <SectionSkeleton fields={2} columns={2} />
      <SectionSkeleton fields={3} columns={3} />
    </div>
  );
}
