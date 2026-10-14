import type { CSSProperties } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getAppContext } from "@/lib/dashboard";

// Collapsed rail wide enough for the 40px logo, nav buttons and avatar used when expanded
const SIDEBAR_STYLE = { "--sidebar-width-icon": "4rem" } as CSSProperties;

export default function AppLayout({ children }: LayoutProps<"/">) {
  const { user, organization, organizations } = getAppContext();

  return (
    <SidebarProvider style={SIDEBAR_STYLE}>
      <AppSidebar user={user} />
      <SidebarInset className="min-w-0">
        <TopBar
          user={user}
          organizations={organizations}
          currentOrganizationId={organization.id}
        />
        <div className="flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
