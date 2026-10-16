import { Skeleton } from "@/components/ui/skeleton";

// While /welcome checks the session: the same blocks as CreateOrganizationForm (greeting, the
// "Create my organization" header with its icon, the name field and the button)
export function CreateOrganizationSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-72" />
      </div>
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <Skeleton className="size-10 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3.5 w-full max-w-64" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-3.5 w-40" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}
