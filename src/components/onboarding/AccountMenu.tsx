"use client";

import { useTransition } from "react";
import { LogOutIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/users/UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/format";

interface AccountMenuProps {
  name: string | null;
  email: string | null;
  image: string | null;
}

// The signed-in user on pages without the sidebar (/welcome): who they are, the theme and sign out
export function AccountMenu({ name, email, image }: AccountMenuProps) {
  const t = useTranslations("userMenu");
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [signingOut, startSignOut] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("account")} className="size-11 rounded-full">
          <UserAvatar image={image} initials={getInitials(name, email)} className="size-10" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56 rounded-xl">
        <DropdownMenuLabel className="grid font-normal">
          <span className="truncate font-semibold text-foreground">{name}</span>
          <span className="truncate text-xs text-muted-foreground">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
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
  );
}
