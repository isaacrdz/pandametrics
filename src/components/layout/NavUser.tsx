"use client";

import { ChevronsUpDownIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { getInitials } from "@/lib/format";

interface NavUserProps {
  name: string | null;
  email: string | null;
}

export function NavUser({ name, email }: NavUserProps) {
  const t = useTranslations("userMenu");
  const { isMobile } = useSidebar();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="h-auto gap-3 rounded-2xl bg-muted/70 p-3 group-data-[collapsible=icon]:bg-transparent"
            >
              <Avatar className="size-10 group-data-[collapsible=icon]:size-8">
                <AvatarFallback className="bg-accent font-semibold text-accent-foreground">
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold text-foreground">{name}</span>
                <span className="truncate text-xs text-muted-foreground">{email}</span>
              </span>
              <ChevronsUpDownIcon aria-hidden className="ml-auto text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isMobile ? "top" : "right"}
            align="end"
            className="min-w-56 rounded-xl"
          >
            <DropdownMenuLabel>{t("account")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setTheme(isDark ? "light" : "dark")}>
              {isDark ? <SunIcon aria-hidden /> : <MoonIcon aria-hidden />}
              {isDark ? t("lightMode") : t("darkMode")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
