"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2Icon, MailIcon, UserMinusIcon, UserPlusIcon, XIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { invitePlanMember, removePlanMember, revokePlanInvitation } from "@/actions/plans";
import { UserAvatar } from "@/components/users/UserAvatar";
import { UserConfirmDialog } from "@/components/users/table/UserConfirmDialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WELCOME_PATH } from "@/lib/auth/paths";
import { getInitials } from "@/lib/format";
import { BUSINESS_SEATS, MAX_MEMBERSHIPS, PLAN_LIMITS } from "@/lib/plans/limits";
import type { PlanMemberRow, PlanMembers } from "@/lib/plans/seats";

const FIELD_ID = "plan-invite-email";

interface PlanMembersCardProps {
  data: PlanMembers;
  // The plan expired: only removing stays possible
  expired: boolean;
  // A plan invite also joins the owner's organization, so there must be one
  ownsOrganization: boolean;
}

// Settings → Plan, Business owner (docs/subscriptions.md, section 8.1): who shares the plan, pending
// plan invites and the invite form. Removing someone ends their seat and their membership in the
// owner's organization; their surveys stay
export function PlanMembersCard({ data, expired, ownsOrganization }: PlanMembersCardProps) {
  const t = useTranslations("plan.members");
  const tErrors = useTranslations("invitations.errors");
  const format = useFormatter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isInviting, startInvite] = useTransition();
  const [isWorking, startWork] = useTransition();
  const [removeTarget, setRemoveTarget] = useState<PlanMemberRow | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);

  const used = data.members.length + data.pending.length;
  const full = used >= BUSINESS_SEATS;
  const params = { limit: PLAN_LIMITS.PRO.invites, max: MAX_MEMBERSHIPS, seats: BUSINESS_SEATS };
  const blockedReason = expired ? t("blocked.expired") : !ownsOrganization ? null : full ? t("blocked.full", { seats: BUSINESS_SEATS }) : null;
  const canInvite = !expired && ownsOrganization && !full;

  function invite(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startInvite(async () => {
      const result = await invitePlanMember(email);
      if (!result.success) {
        setError(tErrors(result.error.code, params));
        return;
      }
      toast.success(t("toasts.invited"), { description: email });
      setEmail("");
    });
  }

  function revoke(id: string, label: string | null) {
    startWork(async () => {
      const result = await revokePlanInvitation(id);
      if (!result.success) toast.error(tErrors(result.error.code, params));
      else toast.success(t("toasts.revoked"), { description: label ?? undefined });
    });
  }

  function confirmRemove() {
    if (!removeTarget) return;
    const target = removeTarget;
    startWork(async () => {
      const result = await removePlanMember(target.userId);
      setRemoveOpen(false);
      if (!result.success) toast.error(tErrors(result.error.code, params));
      else toast.success(t("toasts.removed"), { description: target.name ?? target.email ?? undefined });
    });
  }

  return (
    <section aria-labelledby="plan-members-title" className="rounded-3xl border border-card-border bg-card p-6 sm:p-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="plan-members-title" className="text-lg font-semibold text-foreground">
            {t("title")}
          </h2>
          <p className="text-sm font-medium text-muted-foreground">{t("seats", { used, seats: BUSINESS_SEATS })}</p>
        </div>

        {data.members.length === 0 && data.pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty", { seats: BUSINESS_SEATS })}</p>
        ) : (
          <ul className="divide-y divide-card-border rounded-2xl border border-card-border">
            {data.members.map((member) => (
              <li key={member.userId} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <UserAvatar image={member.image} initials={getInitials(member.name)} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-semibold text-foreground">{member.name ?? member.email}</span>
                  <span className="truncate text-sm text-muted-foreground">{member.email}</span>
                </span>
                <span className="text-sm text-muted-foreground">
                  {t("joined", { date: format.dateTime(new Date(member.joinedAt), { dateStyle: "medium" }) })}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isWorking}
                  onClick={() => {
                    setRemoveTarget(member);
                    setRemoveOpen(true);
                  }}
                  aria-label={t("removeLabel", { name: member.name ?? member.email ?? "" })}
                  className="gap-1.5 rounded-full text-muted-foreground hover:text-destructive"
                >
                  <UserMinusIcon aria-hidden className="size-4" />
                  {t("remove")}
                </Button>
              </li>
            ))}
            {data.pending.map((invitation) => (
              <li key={invitation.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                  <MailIcon className="size-5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-semibold text-foreground">{invitation.name ?? invitation.email}</span>
                  <span className="truncate text-sm text-muted-foreground">{invitation.email}</span>
                </span>
                <span className="inline-flex items-center rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-primary">
                  {t("invited")}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t("expires", { date: format.dateTime(new Date(invitation.expiresAt), { dateStyle: "medium" }) })}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isWorking}
                  onClick={() => revoke(invitation.id, invitation.email)}
                  aria-label={t("revokeLabel", { email: invitation.email ?? "" })}
                  className="gap-1.5 rounded-full text-muted-foreground hover:text-destructive"
                >
                  <XIcon aria-hidden className="size-4" />
                  {t("revoke")}
                </Button>
              </li>
            ))}
          </ul>
        )}

        {!ownsOrganization ? (
          <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
            {t("blocked.noOrganization")}{" "}
            <Link href={WELCOME_PATH} className="font-semibold text-primary underline-offset-4 hover:underline">
              {t("createOrganization")}
            </Link>
          </p>
        ) : (
          <form onSubmit={invite} noValidate className="flex flex-col gap-3 border-t border-card-border pt-6">
            <Field data-invalid={error !== null}>
              <FieldLabel htmlFor={FIELD_ID}>{t("inviteLabel")}</FieldLabel>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  id={FIELD_ID}
                  type="email"
                  autoComplete="email"
                  value={email}
                  disabled={!canInvite}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={error !== null}
                  aria-describedby={error ? `${FIELD_ID}-error` : `${FIELD_ID}-hint`}
                  className="h-11 flex-1 rounded-xl"
                />
                {canInvite ? (
                  <Button type="submit" disabled={isInviting || email.trim() === ""} className="h-11 gap-2 rounded-full px-5">
                    {isInviting ? <Loader2Icon aria-hidden className="animate-spin" /> : <UserPlusIcon aria-hidden />}
                    {t("invite")}
                  </Button>
                ) : (
                  // The reason it can't send: the tooltip is reachable by keyboard (aria-disabled)
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        aria-disabled="true"
                        onClick={(event) => event.preventDefault()}
                        className="h-11 cursor-not-allowed gap-2 rounded-full px-5 opacity-60"
                      >
                        <UserPlusIcon aria-hidden />
                        {t("invite")}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-64">{blockedReason}</TooltipContent>
                  </Tooltip>
                )}
              </div>
              {error ? (
                <FieldError id={`${FIELD_ID}-error`}>{error}</FieldError>
              ) : (
                <FieldDescription id={`${FIELD_ID}-hint`}>{blockedReason ?? t("inviteHint")}</FieldDescription>
              )}
            </Field>
            <p className="text-sm text-muted-foreground">{t("emailSoon")}</p>
          </form>
        )}
      </div>

      <UserConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title={t("removeTitle", { name: removeTarget?.name ?? removeTarget?.email ?? "" })}
        description={t("removeDescription")}
        confirmLabel={t("remove")}
        pendingLabel={t("removing")}
        isPending={isWorking}
        onConfirm={confirmRemove}
      />
    </section>
  );
}
