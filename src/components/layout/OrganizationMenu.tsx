"use client";

import Link from "next/link";
import { CheckIcon, LogOutIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { UserConfirmDialog } from "@/components/users/table/UserConfirmDialog";
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { WELCOME_PATH } from "@/lib/auth/paths";
import type { Organization } from "@/types/survey";

// What the sidebar user menu needs to show the user's organizations. Computed on the server from
// the session (SidebarUser), like the rest of the card
export interface OrganizationMenuData {
  organizations: Organization[];
  // null without an organization yet (/profile, /settings/plan on the way to /welcome)
  currentId: string | null;
  // The user owns no organization yet: offer to create theirs (on /welcome)
  canCreate: boolean;
  // The active organization is not the user's own: they may leave it
  canLeave: boolean;
  // The active organization is the Business owner's whose plan the user is on (their name): the
  // leave dialog warns the seat ends too
  leavesPlanOf: string | null;
}

interface OrganizationMenuItemsProps {
  data: OrganizationMenuData;
  onSelect: (id: string) => void;
  onLeave: () => void;
}

// The "Organizations" section of the sidebar user menu: every active membership (the current one
// checked), then "Create organization" and "Leave {name}" when they apply. Renders only menu items,
// so it lives inside NavUser's dropdown
export function OrganizationMenuItems({ data, onSelect, onLeave }: OrganizationMenuItemsProps) {
  const t = useTranslations("organizations.menu");
  const current = data.organizations.find((organization) => organization.id === data.currentId);
  if (data.organizations.length === 0 && !data.canCreate) return null;

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>{t("title")}</DropdownMenuLabel>
      {data.organizations.map((organization) => {
        const isCurrent = organization.id === data.currentId;
        return (
          <DropdownMenuItem
            key={organization.id}
            aria-current={isCurrent ? "true" : undefined}
            onSelect={() => {
              if (!isCurrent) onSelect(organization.id);
            }}
          >
            <span className="truncate">{organization.name}</span>
            {isCurrent && <CheckIcon aria-hidden className="ml-auto" />}
          </DropdownMenuItem>
        );
      })}
      {data.canCreate && (
        <DropdownMenuItem asChild>
          <Link href={WELCOME_PATH}>
            <PlusIcon aria-hidden />
            {t("create")}
          </Link>
        </DropdownMenuItem>
      )}
      {data.canLeave && current && (
        <DropdownMenuItem variant="destructive" onSelect={onLeave}>
          <LogOutIcon aria-hidden />
          <span className="truncate">{t("leave", { name: current.name })}</span>
        </DropdownMenuItem>
      )}
    </>
  );
}

interface LeaveOrganizationDialogProps {
  data: OrganizationMenuData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: () => void;
}

// Confirmation before leaving the active organization (outside the menu, which closes first)
export function LeaveOrganizationDialog({ data, open, onOpenChange, isPending, onConfirm }: LeaveOrganizationDialogProps) {
  const t = useTranslations("organizations.menu");
  const current = data.organizations.find((organization) => organization.id === data.currentId);
  if (!current) return null;

  return (
    <UserConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("leaveTitle", { name: current.name })}
      description={
        data.leavesPlanOf !== null ? `${t("leaveDescription")} ${t("leavePlanNote", { owner: data.leavesPlanOf })}` : t("leaveDescription")
      }
      confirmLabel={t("leaveConfirm")}
      pendingLabel={t("leavePending")}
      isPending={isPending}
      onConfirm={onConfirm}
    />
  );
}
