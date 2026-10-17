"use client";

import { useTransition } from "react";
import Link from "next/link";
import { MoreHorizontalIcon, PencilIcon, UserCheckIcon, UserXIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { setUserActive } from "@/actions/users";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserRow } from "@/lib/users/list";

interface UserActionsMenuProps {
  row: UserRow;
  onDeactivate: (row: UserRow) => void;
  // Owner or admin of the organization
  canManage: boolean;
}

// Edit and Deactivate / Activate. Deactivating asks for confirmation in the section's dialog;
// activating can be undone, so it runs right away.
export function UserActionsMenu({ row, onDeactivate, canManage }: UserActionsMenuProps) {
  const t = useTranslations("users");
  const [isPending, startTransition] = useTransition();

  function activate() {
    startTransition(async () => {
      const result = await setUserActive(row.id, true);
      if (!result.success) {
        toast.error(t(`errors.${result.error.code}`));
        return;
      }
      toast.success(t("toasts.activated"), { description: row.name });
    });
  }

  // Your own row opens the profile; others are edited by the owner and admins, and the owner by
  // nobody else. Members have no actions on other people's rows
  const canEdit = row.isCurrentUser || (canManage && !row.isOwner);
  if (!canEdit && !canManage) return <span aria-hidden className="size-9 shrink-0" />;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={isPending}
          aria-label={t("actions.label", { name: row.name })}
          className="size-9 rounded-lg text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          <MoreHorizontalIcon aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52 rounded-xl">
        {canEdit && (
          <DropdownMenuItem asChild>
            <Link href={row.isCurrentUser ? "/profile" : `/users/${row.id}`}>
              <PencilIcon aria-hidden />
              {t("actions.edit")}
            </Link>
          </DropdownMenuItem>
        )}
        {canEdit && canManage && <DropdownMenuSeparator />}
        {canManage && (row.isActive ? (
          <DropdownMenuItem
            variant="destructive"
            disabled={row.isCurrentUser || row.isOwner}
            onSelect={() => onDeactivate(row)}
          >
            <UserXIcon aria-hidden />
            {t("actions.deactivate")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={activate}>
            <UserCheckIcon aria-hidden />
            {t("actions.activate")}
          </DropdownMenuItem>
        ))}
        {canManage && (row.isCurrentUser || row.isOwner) && (
          <DropdownMenuLabel className="pt-0 pl-8 text-xs font-normal text-muted-foreground">
            {row.isCurrentUser ? t("actions.selfHint") : t("actions.ownerHint")}
          </DropdownMenuLabel>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
