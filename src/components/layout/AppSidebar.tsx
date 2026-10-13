import Link from "next/link";
import { SparklesIcon } from "lucide-react";
import { NavMain } from "@/components/layout/NavMain";
import { NavUser } from "@/components/layout/NavUser";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import type { User } from "@/types/survey";

// Brand name, the same in every language
const BRAND_NAME = "panda metrics";

interface AppSidebarProps {
  user: User;
}

export function AppSidebar({ user }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 pt-5 pb-6 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-highlight text-highlight-foreground shadow-[0_8px_20px_-8px_var(--highlight)] group-data-[collapsible=icon]:size-8">
              <SparklesIcon aria-hidden className="size-5 fill-current" />
            </span>
            <span className="truncate text-lg font-bold text-foreground group-data-[collapsible=icon]:hidden">
              {BRAND_NAME}
            </span>
          </Link>
          <SidebarTrigger className="text-muted-foreground group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
      <SidebarFooter className="p-3">
        <NavUser name={user.name} email={user.email} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
