"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardListIcon,
  LayoutGridIcon,
  SlidersHorizontalIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

type NavKey = "dashboard" | "surveys" | "settings";

interface NavItem {
  key: NavKey;
  href: string;
  icon: LucideIcon;
  // Pages that do not exist yet are shown disabled
  enabled: boolean;
}

interface NavGroup {
  key: "workspace" | "manage";
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    key: "workspace",
    items: [
      { key: "dashboard", href: "/dashboard", icon: LayoutGridIcon, enabled: true },
      { key: "surveys", href: "/surveys", icon: ClipboardListIcon, enabled: true },
    ],
  },
  {
    key: "manage",
    items: [{ key: "settings", href: "/settings", icon: SlidersHorizontalIcon, enabled: false }],
  },
];

const LABEL_CLASS =
  "text-[0.7rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase";

const BUTTON_CLASS =
  "h-11 gap-3 rounded-xl px-3 text-[0.95rem] text-sidebar-foreground [&_svg]:size-5 data-active:text-sidebar-accent-foreground";

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const t = useTranslations("nav");
  const Icon = item.icon;
  const title = t(item.key);

  if (!item.enabled) {
    return (
      <SidebarMenuButton disabled tooltip={t("comingSoon", { title })} className={BUTTON_CLASS}>
        <Icon aria-hidden />
        <span>{title}</span>
      </SidebarMenuButton>
    );
  }

  return (
    <SidebarMenuButton asChild isActive={isActive} tooltip={title} className={BUTTON_CLASS}>
      <Link href={item.href} aria-current={isActive ? "page" : undefined}>
        <Icon aria-hidden />
        <span>{title}</span>
        {isActive && (
          <span
            aria-hidden
            className="ml-auto size-1.5 shrink-0 rounded-full bg-primary group-data-[collapsible=icon]:hidden"
          />
        )}
      </Link>
    </SidebarMenuButton>
  );
}

function NavMainItems({ pathname }: { pathname: string | null }) {
  const t = useTranslations("nav");

  return NAV_GROUPS.map((group, index) => (
    <div key={group.key}>
      {index > 0 && <SidebarSeparator className="mx-3 my-2" />}
      <SidebarGroup className="px-3">
        <SidebarGroupLabel className={LABEL_CLASS}>{t(group.key)}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="gap-1">
            {group.items.map((item) => (
              <SidebarMenuItem key={item.href}>
                <NavLink item={item} isActive={pathname?.startsWith(item.href) ?? false} />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </div>
  ));
}

function NavMainWithPathname() {
  return <NavMainItems pathname={usePathname()} />;
}

// usePathname() is runtime data on dynamic routes (/surveys/[id]): the menu prerenders
// without an active item and the active state streams in
export function NavMain() {
  return (
    <Suspense fallback={<NavMainItems pathname={null} />}>
      <NavMainWithPathname />
    </Suspense>
  );
}
