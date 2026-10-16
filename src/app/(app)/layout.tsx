import { Suspense, type CSSProperties } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppContentSkeleton, NavUserSkeleton } from "@/components/layout/AppShellSkeleton";
import { AppShellProvider } from "@/components/layout/AppShellProvider";
import { SidebarUser } from "@/components/layout/SidebarUser";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getAppContext } from "@/server/app-context";

// Collapsed rail wide enough for the 40px logo, nav buttons and avatar used when expanded
const SIDEBAR_STYLE = { "--sidebar-width-icon": "4rem" } as CSSProperties;

// The signed-in user comes from the session cookie (request data), so the sidebar frame and
// navigation are the static shell and everything that depends on the user streams in Suspense
async function AppContent({ children }: { children: React.ReactNode }) {
  const { user, organization, organizations } = await getAppContext();

  return (
    // Each page renders its own AppTopBar (its header) from this shared data
    <AppShellProvider value={{ userName: user.name, organizations, currentOrganizationId: organization.id }}>
      <div className="flex-1">{children}</div>
    </AppShellProvider>
  );
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <SidebarProvider style={SIDEBAR_STYLE}>
      <AppSidebar
        user={
          <Suspense fallback={<NavUserSkeleton />}>
            <SidebarUser />
          </Suspense>
        }
      />
      <SidebarInset className="min-w-0">
        <Suspense fallback={<AppContentSkeleton />}>
          <AppContent>{children}</AppContent>
        </Suspense>
      </SidebarInset>
    </SidebarProvider>
  );
}
