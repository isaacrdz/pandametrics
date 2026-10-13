import { Skeleton } from "@/components/ui/skeleton";

function SurveyCardSkeleton() {
  return (
    <div className="flex flex-col gap-6 rounded-3xl border border-card-border bg-card p-5 sm:p-8">
      <div className="flex justify-between gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="h-11 w-36 rounded-xl" />
      </div>
      <div className="flex flex-col gap-4 rounded-2xl border border-card-border p-5 sm:p-8">
        <Skeleton className="mx-auto h-7 w-56" />
        <Skeleton className="h-5 w-2/3" />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-3 w-full" />
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Cargando resumen" className="flex flex-col gap-10">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <SurveyCardSkeleton />
        <SurveyCardSkeleton />
      </div>
    </div>
  );
}
