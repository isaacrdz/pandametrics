import { Skeleton } from "@/components/ui/skeleton";
import { SidebarMenu, SidebarMenuItem, SidebarTrigger } from "@/components/ui/sidebar";

// Fallbacks while the session and the acting user load (src/app/(app)/layout.tsx). Same sizes as
// what they replace, so nothing moves when the content streams in

export function NavUserSkeleton() {
  return (
    <SidebarMenu aria-hidden>
      <SidebarMenuItem className="flex items-center gap-3 rounded-2xl bg-muted/70 p-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="grid flex-1 gap-1.5 group-data-[collapsible=icon]:hidden">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-36" />
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

// The page's top bar (AppTopBar is h-20) with the mobile sidebar trigger, then empty content
export function AppContentSkeleton() {
  return (
    <div aria-busy className="flex-1">
      <div className="flex h-20 items-center gap-3 border-b px-4 md:px-8">
        <SidebarTrigger className="md:hidden" />
        <Skeleton className="h-7 w-48" />
      </div>
    </div>
  );
}
