import { Skeleton } from "@/components/ui/skeleton";

// While the page reads the session: the current-plan card's blocks
export function PlanSettingsSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-6 rounded-3xl border border-card-border bg-card p-6 sm:p-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="grid gap-5 border-t border-card-border pt-6 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-32" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 border-t border-card-border pt-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
  );
}
