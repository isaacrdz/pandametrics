"use client";

import { useState, useTransition } from "react";
import { Trash2Icon, UserCheckIcon, UserXIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { deleteUsers, setUsersActive, type UserActionResult } from "@/actions/users";
import { BAR_BUTTON_CLASS, SelectionBar } from "@/components/table/SelectionBar";
import { UserConfirmDialog } from "@/components/users/table/UserConfirmDialog";
import { Button } from "@/components/ui/button";

type SuccessKey = "toasts.bulkActivated" | "toasts.bulkDeactivated" | "toasts.bulkDeleted";

interface UsersSelectionBarProps {
  ids: string[];
  onDone: () => void;
}

// Activate runs right away; Deactivate and Delete ask first. Every action is all or nothing.
export function UsersSelectionBar({ ids, onDone }: UsersSelectionBarProps) {
  const t = useTranslations("users");
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<"deactivate" | "delete" | null>(null);
  const count = ids.length;

  function run(action: () => Promise<UserActionResult<{ count: number }>>, successKey: SuccessKey) {
    startTransition(async () => {
      const result = await action();
      setConfirm(null);
      if (!result.success) {
        toast.error(t(`errors.${result.error.code}`));
        return;
      }
      toast.success(t(successKey, { count: result.data.count }));
      onDone();
    });
  }

  return (
    <SelectionBar label={t("bulk.label")} countLabel={t("select.count", { count })} disabled={isPending} onClear={onDone}>
      <Button
        variant="outline"
        disabled={isPending}
        onClick={() => run(() => setUsersActive(ids, true), "toasts.bulkActivated")}
        className={`${BAR_BUTTON_CLASS} bg-card`}
      >
        <UserCheckIcon aria-hidden />
        {t("bulk.activate")}
      </Button>
      <Button
        variant="outline"
        disabled={isPending}
        onClick={() => setConfirm("deactivate")}
        className={`${BAR_BUTTON_CLASS} bg-card`}
      >
        <UserXIcon aria-hidden />
        {t("bulk.deactivate")}
      </Button>
      <Button variant="destructive" disabled={isPending} onClick={() => setConfirm("delete")} className={BAR_BUTTON_CLASS}>
        <Trash2Icon aria-hidden />
        {t("bulk.delete")}
      </Button>

      <UserConfirmDialog
        open={confirm === "deactivate"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={t("deactivate.titleMany", { count })}
        description={t("deactivate.description", { count })}
        confirmLabel={t("deactivate.confirm")}
        pendingLabel={t("deactivate.pending")}
        isPending={isPending}
        onConfirm={() => run(() => setUsersActive(ids, false), "toasts.bulkDeactivated")}
      />
      <UserConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={t("delete.title", { count })}
        description={t("delete.description", { count })}
        confirmLabel={t("delete.confirm")}
        pendingLabel={t("delete.pending")}
        isPending={isPending}
        onConfirm={() => run(() => deleteUsers(ids), "toasts.bulkDeleted")}
      />
    </SelectionBar>
  );
}
