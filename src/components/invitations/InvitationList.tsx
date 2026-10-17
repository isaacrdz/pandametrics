"use client";

import { useState, useTransition } from "react";
import { Building2Icon, CheckIcon, Loader2Icon, XIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { acceptInvitation, declineInvitation } from "@/actions/invitations";
import { Button } from "@/components/ui/button";
import type { InvitationRow } from "@/lib/invitations/service";
import { MAX_MEMBERSHIPS, PLAN_LIMITS } from "@/lib/plans/limits";

// The signed-in user's pending invitations (/invitations and /welcome). Accepting opens the
// organization's dashboard; declining removes the row
export function InvitationList({ invitations }: { invitations: InvitationRow[] }) {
  const t = useTranslations("invitations");
  const format = useFormatter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<{ id: string; action: "accept" | "decline" } | null>(null);

  function run(invitation: InvitationRow, action: "accept" | "decline") {
    setBusy({ id: invitation.id, action });
    startTransition(async () => {
      const result = await (action === "accept" ? acceptInvitation : declineInvitation)(invitation.id);
      // Accepting redirects; only errors and declines come back
      setBusy(null);
      if (!result.success) {
        toast.error(t(`errors.${result.error.code}`, { limit: PLAN_LIMITS.PRO.invites, max: MAX_MEMBERSHIPS }));
        return;
      }
      toast.success(t("toasts.declined"), { description: invitation.organizationName });
    });
  }

  return (
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
              <span className="truncate font-semibold text-foreground">{invitation.organizationName}</span>
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
  );
}
