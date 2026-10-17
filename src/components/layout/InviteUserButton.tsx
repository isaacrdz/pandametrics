"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2Icon, SparklesIcon, UserPlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { inviteUser } from "@/actions/invitations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MAX_MEMBERSHIPS } from "@/lib/plans/limits";
import { cn } from "@/lib/utils";

// What the signed-in user can do on /users (docs/subscriptions.md, section 6.6)
export type InviteState =
  | { kind: "available"; used: number; limit: number }
  | { kind: "pro-required"; isOwner: boolean }
  | { kind: "hidden" };

const BUTTON_CLASS = "h-11 gap-2 rounded-full px-3 text-[0.95rem] @3xl:px-5";
const FIELD_ID = "invite-email";

// Owner or admin of a Pro organization: invites an existing account by email (up to 3 people
// besides the owner, pending invitations included). On Free or an expired plan it is a Pro
// feature; members don't see it
export function InviteUserButton({ invite }: { invite: InviteState }) {
  const t = useTranslations("users");
  const tInvite = useTranslations("invitations");
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (invite.kind === "hidden") return null;

  if (invite.kind === "pro-required") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {invite.isOwner ? (
            <Button asChild variant="outline" className={cn(BUTTON_CLASS, "text-muted-foreground")}>
              <Link href="/settings/plan" aria-label={tInvite("proFeatureLabel")}>
                <SparklesIcon aria-hidden className="size-5" />
                <span className="hidden @3xl:inline">{t("invite")}</span>
              </Link>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              aria-disabled="true"
              aria-label={tInvite("proFeatureLabel")}
              onClick={(event) => event.preventDefault()}
              className={cn(BUTTON_CLASS, "cursor-not-allowed text-muted-foreground opacity-70")}
            >
              <UserPlusIcon aria-hidden className="size-5" />
              <span className="hidden @3xl:inline">{t("invite")}</span>
            </Button>
          )}
        </TooltipTrigger>
        <TooltipContent>{invite.isOwner ? tInvite("proFeatureOwner") : tInvite("proFeature")}</TooltipContent>
      </Tooltip>
    );
  }

  const { used, limit } = invite;
  const full = used >= limit;

  function close(next: boolean) {
    if (isPending) return;
    setOpen(next);
    if (!next) {
      setEmail("");
      setError(null);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await inviteUser(email);
      if (!result.success) {
        setError(tInvite(`errors.${result.error.code}`, { limit, max: MAX_MEMBERSHIPS }));
        return;
      }
      toast.success(tInvite("toasts.sent"), { description: email });
      setOpen(false);
      setEmail("");
    });
  }

  return (
    <>
      {full ? (
        // Every place is taken: still focusable (aria-disabled), so the tooltip explains the limit
        // to keyboard and screen reader users too
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              aria-disabled="true"
              aria-label={`${t("invite")}: ${tInvite("full", { limit })}`}
              onClick={(event) => event.preventDefault()}
              className={cn(BUTTON_CLASS, "cursor-not-allowed opacity-60")}
            >
              <UserPlusIcon aria-hidden className="size-5" />
              <span className="hidden @3xl:inline">{t("invite")}</span>
              <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs font-semibold">
                {tInvite("slots", { used, limit })}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-64">{tInvite("full", { limit })}</TooltipContent>
        </Tooltip>
      ) : (
        <Button type="button" onClick={() => setOpen(true)} className={BUTTON_CLASS}>
          <UserPlusIcon aria-hidden className="size-5" />
          <span className="hidden @3xl:inline">{t("invite")}</span>
          <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs font-semibold">
            {tInvite("slots", { used, limit })}
          </span>
        </Button>
      )}

      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={submit} noValidate className="flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle>{tInvite("dialog.title")}</DialogTitle>
              <DialogDescription>{tInvite("dialog.description", { used, limit })}</DialogDescription>
            </DialogHeader>
            <Field data-invalid={error !== null}>
              <FieldLabel htmlFor={FIELD_ID}>{tInvite("dialog.email")}</FieldLabel>
              <Input
                id={FIELD_ID}
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={error !== null}
                aria-describedby={error ? `${FIELD_ID}-error` : `${FIELD_ID}-hint`}
                className="h-11 rounded-xl"
              />
              {error ? (
                <FieldError id={`${FIELD_ID}-error`}>{error}</FieldError>
              ) : (
                <FieldDescription id={`${FIELD_ID}-hint`}>{tInvite("dialog.hint")}</FieldDescription>
              )}
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={isPending} onClick={() => close(false)}>
                {tInvite("dialog.cancel")}
              </Button>
              <Button type="submit" disabled={isPending || email.trim() === ""} className="gap-2">
                {isPending && <Loader2Icon aria-hidden className="animate-spin" />}
                {isPending ? tInvite("dialog.pending") : tInvite("dialog.submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
