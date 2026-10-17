"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BuildingIcon,
  ClipboardListIcon,
  CreditCardIcon,
  LanguagesIcon,
  LayoutGridIcon,
  LogOutIcon,
  MailIcon,
  MonitorSmartphoneIcon,
  MoonIcon,
  PlusIcon,
  RepeatIcon,
  SunIcon,
  UserPlusIcon,
  UserRoundIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { signOutAction } from "@/actions/auth";
import { switchOrganization } from "@/actions/organizations";
import { useAppShell } from "@/components/layout/AppShellProvider";
import { LOCALES } from "@/i18n/config";
import { useAppLocale } from "@/i18n/LocaleProvider";
import { WELCOME_PATH } from "@/lib/auth/paths";
import { matchScore } from "@/lib/search/match";

export interface PaletteEntry {
  id: string;
  label: string;
  // Aliases in both languages, so "configuración" finds Plan in English too
  keywords: readonly string[];
  icon: LucideIcon;
  // Go to only: the page you are on
  current?: boolean;
  // Go to only: a count next to the label (pending invitations)
  count?: number;
  run: () => void;
}

interface PageDefinition {
  id: string;
  href: string;
  icon: LucideIcon;
  keywords: readonly string[];
  // Organization pages redirect to /welcome without one, so they are hidden then
  needsOrganization: boolean;
}

const PAGES: PageDefinition[] = [
  { id: "dashboard", href: "/dashboard", icon: LayoutGridIcon, keywords: ["home", "inicio", "panel", "metrics", "métricas"], needsOrganization: true },
  { id: "surveys", href: "/surveys", icon: ClipboardListIcon, keywords: ["encuestas", "surveys", "forms"], needsOrganization: true },
  { id: "users", href: "/users", icon: UsersIcon, keywords: ["usuarios", "people", "personas", "members", "miembros", "team", "equipo"], needsOrganization: true },
  { id: "invitations", href: "/invitations", icon: MailIcon, keywords: ["invitaciones", "invites", "invitations"], needsOrganization: false },
  { id: "profile", href: "/profile", icon: UserRoundIcon, keywords: ["perfil", "profile", "account", "cuenta", "password", "contraseña"], needsOrganization: false },
  { id: "plan", href: "/settings/plan", icon: CreditCardIcon, keywords: ["settings", "configuración", "billing", "facturación", "subscription", "suscripción", "pro"], needsOrganization: false },
];

const ORGANIZATION_KEYWORDS = ["organization", "organización", "switch", "cambiar"];

function sortByScore(entries: PaletteEntry[], query: string): PaletteEntry[] {
  return entries
    .map((entry) => ({ entry, score: matchScore(entry.label, query, entry.keywords) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ entry }) => entry);
}

// Go to and Actions for the signed-in user, filtered and ranked for the query (instant, no server).
// Every action follows the same rule as its button elsewhere in the app
export function usePaletteEntries(query: string): { pages: PaletteEntry[]; actions: PaletteEntry[] } {
  const t = useTranslations("search");
  const tNav = useTranslations("nav");
  const tUserMenu = useTranslations("userMenu");
  const tTopBar = useTranslations("topBar");
  const tUsers = useTranslations("users");
  const tInvitations = useTranslations("invitations");
  const tPlan = useTranslations("plan");
  const tLanguages = useTranslations("languages");
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const { locale, setLocale } = useAppLocale();
  const [, startTransition] = useTransition();
  const { organizations, currentOrganizationId, role, ownsOrganization, organizationPlan, pendingInvitations } = useAppShell();

  const hasOrganization = currentOrganizationId !== null;
  const pageLabels: Record<string, string> = {
    dashboard: tNav("dashboard"),
    surveys: tNav("surveys"),
    users: tNav("users"),
    invitations: tInvitations("menu"),
    profile: tUserMenu("profile"),
    plan: tPlan("title"),
  };

  const pages: PaletteEntry[] = PAGES.filter((page) => hasOrganization || !page.needsOrganization).map((page) => ({
    id: `page:${page.id}`,
    label: pageLabels[page.id],
    keywords: page.keywords,
    icon: page.icon,
    current: pathname === page.href || pathname.startsWith(`${page.href}/`),
    count: page.id === "invitations" && pendingInvitations > 0 ? pendingInvitations : undefined,
    run: () => router.push(page.href),
  }));

  const isDark = resolvedTheme === "dark";
  const otherLocale = LOCALES.find((candidate) => candidate !== locale) ?? locale;
  // Owners and admins of a Pro organization invite; the dialog itself explains a full organization
  const canInvite = (role === "OWNER" || role === "ADMIN") && organizationPlan?.tier === "PRO";

  const actions: PaletteEntry[] = [];
  if (hasOrganization) {
    actions.push({
      id: "action:new-survey",
      label: tTopBar("newSurvey"),
      keywords: ["create", "crear", "nueva encuesta", "new survey", "add"],
      icon: PlusIcon,
      run: () => router.push("/surveys/new"),
    });
  }
  if (canInvite) {
    actions.push({
      id: "action:invite",
      label: tUsers("invite"),
      keywords: ["invitar", "invite", "add", "agregar", "member", "miembro"],
      icon: UserPlusIcon,
      run: () => router.push("/users?invite=1"),
    });
  }
  for (const organization of organizations) {
    if (organization.id === currentOrganizationId) continue;
    actions.push({
      id: `action:switch:${organization.id}`,
      label: t("actions.switchTo", { name: organization.name }),
      keywords: ORGANIZATION_KEYWORDS,
      icon: RepeatIcon,
      run: () =>
        startTransition(async () => {
          const result = await switchOrganization(organization.id);
          if (!result.success) toast.error(tTopBar("organizationSwitchError"));
        }),
    });
  }
  if (!ownsOrganization) {
    actions.push({
      id: "action:create-organization",
      label: tTopBar("createOrganization"),
      keywords: ["organization", "organización", "crear", "new"],
      icon: BuildingIcon,
      run: () => router.push(WELCOME_PATH),
    });
  }
  actions.push({
    id: "action:theme",
    label: isDark ? tUserMenu("lightMode") : tUserMenu("darkMode"),
    keywords: ["theme", "tema", "dark", "light", "oscuro", "claro", "modo"],
    icon: isDark ? SunIcon : MoonIcon,
    run: () => setTheme(isDark ? "light" : "dark"),
  });
  actions.push({
    id: "action:language",
    label: t("actions.language", { name: tLanguages(otherLocale) }),
    keywords: ["language", "idioma", "english", "inglés", "español", "spanish"],
    icon: LanguagesIcon,
    run: () => setLocale(otherLocale),
  });
  if (hasOrganization) {
    actions.push({
      id: "action:kiosk",
      label: t("actions.openKiosk"),
      keywords: ["kiosk", "kiosco", "answer", "responder", "tablet"],
      icon: MonitorSmartphoneIcon,
      run: () => window.open("/s", "_blank", "noopener"),
    });
  }
  actions.push({
    id: "action:sign-out",
    label: tUserMenu("signOut"),
    keywords: ["log out", "logout", "cerrar sesión", "salir", "sign out"],
    icon: LogOutIcon,
    run: () => startTransition(() => signOutAction()),
  });

  return { pages: sortByScore(pages, query), actions: sortByScore(actions, query) };
}
