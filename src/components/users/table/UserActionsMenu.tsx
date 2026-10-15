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
}

// Edit and Deactivate / Activate. Deactivating asks for confirmation in the section's dialog;
// activating can be undone, so it runs right away.
export function UserActionsMenu({ row, onDeactivate }: UserActionsMenuProps) {
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
        <DropdownMenuItem asChild>
          <Link href={`/users/${row.id}`}>
            <PencilIcon aria-hidden />
            {t("actions.edit")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {row.isActive ? (
          <DropdownMenuItem
            variant="destructive"
            disabled={row.isCurrentUser}
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
        )}
        {row.isCurrentUser && (
          <DropdownMenuLabel className="pt-0 pl-8 text-xs font-normal text-muted-foreground">
            {t("actions.selfHint")}
          </DropdownMenuLabel>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
