"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ChevronsUpDownIcon, LogOutIcon, MailIcon, MoonIcon, SunIcon, UserRoundIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { signOutAction } from "@/actions/auth";
import { PlanBadge } from "@/components/plans/PlanBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { getInitials } from "@/lib/format";
import type { PlanTier } from "@/lib/plans/plan";

interface NavUserProps {
  name: string | null;
  email: string | null;
  image: string | null;
  planTier: PlanTier;
  // Pending invitations: a count on the menu item and a dot on the avatar
  invitationCount: number;
}

export function NavUser({ name, email, image, planTier, invitationCount }: NavUserProps) {
  const t = useTranslations("userMenu");
  const tInvitations = useTranslations("invitations");
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [signingOut, startSignOut] = useTransition();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="h-auto gap-3 rounded-2xl bg-muted/70 p-3 group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:bg-transparent"
            >
              <span className="relative shrink-0">
                <Avatar className="size-10">
                  {image && <AvatarImage src={image} alt="" referrerPolicy="no-referrer" />}
                  <AvatarFallback className="bg-accent font-semibold text-accent-foreground">
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>
                {invitationCount > 0 && (
                  <span aria-hidden className="absolute -top-0.5 -right-0.5 size-3 rounded-full border-2 border-sidebar bg-primary" />
                )}
              </span>
              {invitationCount > 0 && <span className="sr-only">{tInvitations("menuCount", { count: invitationCount })}</span>}
              <span className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:sr-only">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-semibold text-foreground">{name}</span>
                  <PlanBadge tier={planTier} className="px-1.5 text-[0.65rem]" />
                </span>
                <span className="truncate text-xs text-muted-foreground">{email}</span>
              </span>
              <ChevronsUpDownIcon aria-hidden className="ml-auto text-muted-foreground group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl"
          >
            <DropdownMenuLabel>{t("account")}</DropdownMenuLabel>
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
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={signingOut} onSelect={() => startSignOut(() => signOutAction())}>
              <LogOutIcon aria-hidden />
              {t("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
