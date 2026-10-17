"use client";

import { useState, useTransition } from "react";
import { Building2Icon, CheckIcon, Loader2Icon, XIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { acceptInvitation, declineInvitation, previewInvitation, type InvitationActionErrorCode } from "@/actions/invitations";
import { UserConfirmDialog } from "@/components/users/table/UserConfirmDialog";
import { Button } from "@/components/ui/button";
import type { InvitationPreview, InvitationRow } from "@/lib/invitations/service";
import { MAX_MEMBERSHIPS, PLAN_LIMITS } from "@/lib/plans/limits";

// The signed-in user's pending invitations (/invitations and /welcome). Accepting opens the
// organization's dashboard; declining removes the row. A Business plan invite cancels the user's own
// Individual plan, so accepting one asks first (the server refuses without that confirmation)
export function InvitationList({ invitations }: { invitations: InvitationRow[] }) {
  const t = useTranslations("invitations");
  const format = useFormatter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<{ id: string; action: "accept" | "decline" } | null>(null);
  // A plan invite that would cancel the user's Individual plan, waiting for their confirmation
  const [confirm, setConfirm] = useState<{ invitation: InvitationRow; individual: NonNullable<InvitationPreview["individual"]> } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const params = { limit: PLAN_LIMITS.PRO.invites, max: MAX_MEMBERSHIPS };

  function fail(code: InvitationActionErrorCode) {
    toast.error(t(`errors.${code}`, params));
  }

  function run(invitation: InvitationRow, action: "accept" | "decline", cancelIndividual = false) {
    setBusy({ id: invitation.id, action });
    startTransition(async () => {
      if (action === "accept" && invitation.isPlanInvite && !cancelIndividual) {
        const preview = await previewInvitation(invitation.id);
        if (!preview.success) {
          setBusy(null);
          fail(preview.error.code);
          return;
        }
        if (preview.data.individual) {
          setBusy(null);
          setConfirm({ invitation, individual: preview.data.individual });
          setConfirmOpen(true);
          return;
        }
      }
      const result =
        action === "accept" ? await acceptInvitation(invitation.id, cancelIndividual) : await declineInvitation(invitation.id);
      // Accepting redirects; only errors and declines come back
      setBusy(null);
      setConfirmOpen(false);
      if (!result.success) {
        fail(result.error.code);
        return;
      }
      toast.success(t("toasts.declined"), { description: invitation.organizationName });
    });
  }

  const confirmDescription = confirm
    ? confirm.individual.expired
      ? t("plan.cancelExpired")
      : t("plan.cancelLive", {
          interval: t(`plan.intervals.${confirm.individual.billingInterval}`),
          date: format.dateTime(new Date(confirm.individual.currentPeriodEnd), { dateStyle: "long" }),
          owner: confirm.invitation.invitedByName ?? confirm.invitation.organizationName,
        })
    : "";

  return (
    <>
      <ul className="flex flex-col gap-3">
        {invitations.map((invitation) => {
          const accepting = busy?.id === invitation.id && busy.action === "accept";
          const declining = busy?.id === invitation.id && busy.action === "decline";
          return (
            <li
              key={invitation.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-card-border bg-card px-5 py-4"
            >
              <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                <Building2Icon className="size-5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate font-semibold text-foreground">
                  {invitation.isPlanInvite ? t("plan.label", { organization: invitation.organizationName }) : invitation.organizationName}
                </span>
                <span className="text-sm text-muted-foreground">
                  {invitation.invitedByName
                    ? t("row.invitedBy", { name: invitation.invitedByName })
                    : t("row.invited")}
                  {" · "}
                  {t("row.expires", { date: format.dateTime(new Date(invitation.expiresAt), { dateStyle: "medium" }) })}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => run(invitation, "decline")}
                  aria-label={t("row.declineLabel", { organization: invitation.organizationName })}
                  className="gap-1.5 rounded-full"
                >
                  {declining ? <Loader2Icon aria-hidden className="animate-spin" /> : <XIcon aria-hidden />}
                  {t("row.decline")}
                </Button>
                <Button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(invitation, "accept")}
                  aria-label={t("row.acceptLabel", { organization: invitation.organizationName })}
                  className="gap-1.5 rounded-full"
                >
                  {accepting ? <Loader2Icon aria-hidden className="animate-spin" /> : <CheckIcon aria-hidden />}
                  {t("row.accept")}
                </Button>
              </span>
            </li>
          );
        })}
      </ul>
      <UserConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("plan.cancelTitle")}
        description={confirmDescription}
        confirmLabel={t("plan.cancelConfirm")}
        pendingLabel={t("plan.cancelPending")}
        isPending={isPending}
        onConfirm={() => confirm && run(confirm.invitation, "accept", true)}
      />
    </>
  );
}
