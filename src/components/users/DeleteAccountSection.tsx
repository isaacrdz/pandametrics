"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { deleteAccount } from "@/actions/account";
import { TypedConfirmDialog } from "@/components/form/TypedConfirmDialog";
import { Button } from "@/components/ui/button";
import type { AccountDeletionInfo } from "@/lib/users/delete-account";

interface DeleteAccountSectionProps {
  info: AccountDeletionInfo;
}

// The last card of the profile, apart from the form's sections and away from "Save changes".
// An owner whose organization has other people can't delete yet: the card says why. Rendered inside
// the profile <form>, but nothing here submits it: a plain button, and the dialog stops its own submit
export function DeleteAccountSection({ info }: DeleteAccountSectionProps) {
  const t = useTranslations("profile.deleteAccount");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const organization = info.ownedOrganization;
  const blocked = organization !== null && organization.otherMembers > 0;

  function handleDelete() {
    startTransition(async () => {
      // On success the action signs out and goes to sign in; only errors come back
      const result = await deleteAccount();
      setOpen(false);
      toast.error(t(`errors.${result.error.code}`));
      // Someone joined the organization meanwhile: the card shows why it can't be deleted now
      if (result.error.code === "ORGANIZATION_HAS_MEMBERS") router.refresh();
    });
  }

  return (
    // A container, so the text and the button sit side by side only when the card has room
    <section aria-labelledby="delete-account-title" className="@container rounded-3xl border border-destructive/30 bg-card p-5 sm:p-8">
      <div className="flex flex-col gap-4 @xl:flex-row @xl:items-center @xl:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="delete-account-title" className="text-xl font-bold text-foreground sm:text-2xl">
            {t("title")}
          </h2>
          <p className="text-muted-foreground">{t("description")}</p>
          {organization && (
            <p id="delete-account-organization" className={blocked ? "font-medium text-foreground" : "text-muted-foreground"}>
              {blocked
                ? t("ownerWithMembers", { organization: organization.name, count: organization.otherMembers })
                : t("ownerAlone", { organization: organization.name })}
            </p>
          )}
        </div>
        <Button
          ref={buttonRef}
          type="button"
          variant="outline"
          disabled={blocked}
          aria-describedby={organization ? "delete-account-organization" : undefined}
          onClick={() => setOpen(true)}
          className="h-11 shrink-0 gap-2 rounded-full border-destructive/40 bg-card px-5 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2Icon aria-hidden className="size-5" />
          {t("button")}
        </Button>
      </div>
      <TypedConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("dialog.title")}
        description={
          <>
            <span>{t("dialog.description")}</span>
            {organization && <span>{t("dialog.organization", { organization: organization.name })}</span>}
            <span>{t("dialog.reuse")}</span>
          </>
        }
        confirmLabel={t("dialog.confirm")}
        pendingLabel={t("dialog.deleting")}
        isPending={isPending}
        onConfirm={handleDelete}
        returnFocusRef={buttonRef}
      />
    </section>
  );
}
