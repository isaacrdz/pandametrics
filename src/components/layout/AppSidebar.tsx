import { Logo } from "@/components/brand/Logo";
import { NavMain } from "@/components/layout/NavMain";
import { NavUser } from "@/components/layout/NavUser";
import { SidebarToggle } from "@/components/layout/SidebarToggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { User } from "@/types/survey";

interface AppSidebarProps {
  user: User;
}

export function AppSidebar({ user }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 pt-5 pb-6">
        {/* Row when expanded; logo above the toggle when collapsed to the icon rail */}
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2">
          <Logo
            href="/dashboard"
            className="flex-1 group-data-[collapsible=icon]:flex-none"
            // Still named "Panda Metrics" for screen readers when only the tile shows
            wordmarkClassName="group-data-[collapsible=icon]:sr-only"
          />
          <SidebarToggle />
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
