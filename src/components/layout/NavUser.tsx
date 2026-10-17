"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ChevronsUpDownIcon, Loader2Icon, LogOutIcon, MailIcon, MoonIcon, SunIcon, UserRoundIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { signOutAction } from "@/actions/auth";
import { leaveOrganization, switchOrganization } from "@/actions/organizations";
import { LeaveOrganizationDialog, OrganizationMenuItems, type OrganizationMenuData } from "@/components/layout/OrganizationMenu";
import { PlanBadge } from "@/components/plans/PlanBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { UserAvatar } from "@/components/users/UserAvatar";
import { getInitials } from "@/lib/format";
import { MAX_MEMBERSHIPS } from "@/lib/plans/limits";
import type { PlanTier } from "@/lib/plans/plan";

interface NavUserProps {
  name: string | null;
  email: string | null;
  image: string | null;
  planTier: PlanTier;
  // Pending invitations: a count on the menu item and a dot on the avatar
  invitationCount: number;
  // The user's organizations: the active one names the card, the menu switches, creates and leaves
  organizationMenu: OrganizationMenuData;
}

export function NavUser({ name, email, image, planTier, invitationCount, organizationMenu }: NavUserProps) {
  const t = useTranslations("userMenu");
  const tInvitations = useTranslations("invitations");
  const tOrganizations = useTranslations("organizations");
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [signingOut, startSignOut] = useTransition();
  const [switching, startSwitch] = useTransition();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, startLeave] = useTransition();
  // The second line: the organization the user is working in, or their email before they have one
  const organizationName = organizationMenu.organizations.find((organization) => organization.id === organizationMenu.currentId)?.name;
  const subtitle = organizationName ?? email;

  // Saved on the server (cookie); the page re-renders with the new organization's data
  function selectOrganization(id: string) {
    startSwitch(async () => {
      const result = await switchOrganization(id);
      if (!result.success) toast.error(tOrganizations("menu.switchError"));
    });
  }

  // Leaving redirects to the next organization (or /welcome); only errors come back
  function leave() {
    startLeave(async () => {
      const result = await leaveOrganization();
      setLeaveOpen(false);
      if (!result.success) toast.error(tOrganizations(`errors.${result.error.code}`, { max: MAX_MEMBERSHIPS }));
    });
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              aria-busy={switching}
              className="h-auto gap-3 rounded-2xl bg-muted/70 p-3 group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:bg-transparent"
            >
              <span className="relative shrink-0">
                <UserAvatar image={image} initials={getInitials(name, email)} className="size-10" />
                {invitationCount > 0 && (
                  <span aria-hidden className="absolute -top-0.5 -right-0.5 size-3 rounded-full border-2 border-sidebar bg-primary" />
                )}
              </span>
              {invitationCount > 0 && <span className="sr-only">{tInvitations("menuCount", { count: invitationCount })}</span>}
              <span className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:sr-only">
                <span className="truncate font-semibold text-foreground">{name}</span>
                <span title={subtitle ?? undefined} className="truncate text-xs text-muted-foreground">
                  {subtitle}
                </span>
              </span>
              {switching ? (
                <Loader2Icon aria-hidden className="ml-auto animate-spin text-muted-foreground group-data-[collapsible=icon]:hidden" />
              ) : (
                <ChevronsUpDownIcon aria-hidden className="ml-auto text-muted-foreground group-data-[collapsible=icon]:hidden" />
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl"
          >
            {/* The plan sits next to the account heading instead of on the card */}
            <DropdownMenuLabel className="flex items-center justify-between gap-2">
              {t("account")}
              <PlanBadge tier={planTier} className="px-1.5 text-[0.65rem]" />
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <UserRoundIcon aria-hidden />
                {t("profile")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/invitations">
                <MailIcon aria-hidden />
                {tInvitations("menu")}
                {invitationCount > 0 && (
                  <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
                    {invitationCount}
                  </span>
                )}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setTheme(isDark ? "light" : "dark")}>
              {isDark ? <SunIcon aria-hidden /> : <MoonIcon aria-hidden />}
              {isDark ? t("lightMode") : t("darkMode")}
            </DropdownMenuItem>
            <OrganizationMenuItems data={organizationMenu} onSelect={selectOrganization} onLeave={() => setLeaveOpen(true)} />
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={signingOut} onSelect={() => startSignOut(() => signOutAction())}>
              <LogOutIcon aria-hidden />
              {t("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <LeaveOrganizationDialog
          data={organizationMenu}
          open={leaveOpen}
          onOpenChange={setLeaveOpen}
          isPending={leaving}
          onConfirm={leave}
        />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
