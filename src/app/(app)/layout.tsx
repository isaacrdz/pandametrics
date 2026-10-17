import { Suspense, type CSSProperties } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppContentSkeleton, NavUserSkeleton } from "@/components/layout/AppShellSkeleton";
import { AppShellProvider } from "@/components/layout/AppShellProvider";
import { PlanNoticeBanner } from "@/components/plans/PlanNoticeBanner";
import { CommandPaletteProvider } from "@/components/search/CommandPaletteProvider";
import { SidebarUser } from "@/components/layout/SidebarUser";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { listUserInvitations } from "@/lib/invitations/service";
import { PLAN_LIMITS } from "@/lib/plans/limits";
import { getAccountContext } from "@/server/app-context";

// Collapsed rail wide enough for the 40px logo, nav buttons and avatar used when expanded
const SIDEBAR_STYLE = { "--sidebar-width-icon": "4rem" } as CSSProperties;

// The signed-in user comes from the session cookie (request data), so the sidebar frame and
// navigation are the static shell and everything that depends on the user streams in Suspense
async function AppContent({ children }: { children: React.ReactNode }) {
  // The account level: /profile works without an organization; the organization pages call
  // getAppContext themselves, which sends a user without one to /welcome
  const { user, organization, organizations, role, ownsOrganization, plan, organizationPlan, limits } = await getAccountContext();
  // Cached with the user's tag (the sidebar reads the same list)
  const invitations = await listUserInvitations(user.id);

  return (
    // Each page renders its own AppTopBar (its header) from this shared data
    <AppShellProvider
      value={{
        userId: user.id,
        userName: user.name,
        organizations,
        currentOrganizationId: organization?.id ?? null,
        role,
        ownsOrganization,
        pendingInvitations: invitations.length,
        plan,
        organizationPlan,
        limits: limits ?? PLAN_LIMITS.FREE,
      }}
    >
      {/* ⌘K on every page; the top bar's search button opens it too */}
      <CommandPaletteProvider>
        <PlanNoticeBanner />
        <div className="flex-1">{children}</div>
      </CommandPaletteProvider>
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
