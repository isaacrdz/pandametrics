"use client";

import { useTransition } from "react";
import { MailIcon, XIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { revokeInvitation } from "@/actions/invitations";
import { Button } from "@/components/ui/button";
import type { InvitationRow } from "@/lib/invitations/service";
import { MAX_MEMBERSHIPS, PLAN_LIMITS } from "@/lib/plans/limits";

// /users: invitations still waiting for an answer, above the members. They take a slot until they
// are answered, revoked or expire (14 days). Owners and admins can revoke them
export function PendingInvitationsCard({ invitations, canRevoke }: { invitations: InvitationRow[]; canRevoke: boolean }) {
  const t = useTranslations("invitations");
  const format = useFormatter();
  const [isPending, startTransition] = useTransition();

  function revoke(invitation: InvitationRow) {
    startTransition(async () => {
      const result = await revokeInvitation(invitation.id);
      if (!result.success) {
        toast.error(t(`errors.${result.error.code}`, { limit: PLAN_LIMITS.PRO.invites, max: MAX_MEMBERSHIPS }));
        return;
      }
      toast.success(t("toasts.revoked"), { description: invitation.inviteeEmail ?? undefined });
    });
  }

  return (
    <section aria-labelledby="pending-invitations-title" className="rounded-3xl border border-card-border bg-card">
      <h2 id="pending-invitations-title" className="border-b border-card-border px-6 py-4 font-semibold text-foreground">
        {t("pending.title", { count: invitations.length })}
      </h2>
      <ul className="divide-y divide-card-border">
        {invitations.map((invitation) => (
          <li key={invitation.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-4">
            <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
              <MailIcon className="size-5" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-semibold text-foreground">{invitation.inviteeName ?? invitation.inviteeEmail}</span>
              <span className="truncate text-sm text-muted-foreground">{invitation.inviteeEmail}</span>
            </span>
            <span className="inline-flex items-center rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-primary">
              {t("pending.status")}
            </span>
            <span className="text-sm text-muted-foreground">
              {t("pending.expires", { date: format.dateTime(new Date(invitation.expiresAt), { dateStyle: "medium" }) })}
            </span>
            {canRevoke && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => revoke(invitation)}
                aria-label={t("pending.revokeLabel", { email: invitation.inviteeEmail ?? "" })}
                className="gap-1.5 rounded-full text-muted-foreground hover:text-destructive"
              >
                <XIcon aria-hidden className="size-4" />
                {t("pending.revoke")}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
