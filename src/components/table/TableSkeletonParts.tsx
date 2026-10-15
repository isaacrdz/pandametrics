import { Skeleton } from "@/components/ui/skeleton";

// Pieces of a table card skeleton, shared by the list pages so their loading states match

export function TableToolbarSkeleton({ filters }: { filters: number }) {
  return (
    <div className="flex flex-col gap-3 border-b border-card-border p-4 @2xl:flex-row @2xl:justify-between @2xl:px-6">
      <Skeleton className="h-11 w-full rounded-xl @2xl:max-w-sm" />
      <div className="flex gap-3">
        {Array.from({ length: filters }, (_, i) => (
          <Skeleton key={i} className="h-11 flex-1 rounded-xl @2xl:w-28 @2xl:flex-none" />
        ))}
      </div>
    </div>
  );
}

export function TablePaginationSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-4 @2xl:flex-row @2xl:justify-between @2xl:px-6">
      <Skeleton className="h-4 w-44" />
      {/* Rows per page and pager: side by side on wide cards, wrapped on phones like the real ones */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
        <Skeleton className="h-10 w-40 rounded-xl" />
        <Skeleton className="h-10 w-44 rounded-xl" />
      </div>
    </div>
  );
}
