import { Logo } from "@/components/brand/Logo";
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

interface AppSidebarProps {
  user: User;
}

export function AppSidebar({ user }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 pt-5 pb-6 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-3">
          <Logo
            href="/dashboard"
            className="flex-1"
            iconClassName="group-data-[collapsible=icon]:size-8"
            wordmarkClassName="group-data-[collapsible=icon]:hidden"
          />
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
