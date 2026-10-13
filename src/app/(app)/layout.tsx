import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getAppContext } from "@/lib/dashboard";

export default function AppLayout({ children }: LayoutProps<"/">) {
  const { user, organization, organizations } = getAppContext();

  return (
    <SidebarProvider>
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
