"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckIcon, ChevronDownIcon, Loader2Icon, LogOutIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { leaveOrganization, switchOrganization } from "@/actions/organizations";
import { UserConfirmDialog } from "@/components/users/table/UserConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WELCOME_PATH } from "@/lib/auth/paths";
import { MAX_MEMBERSHIPS } from "@/lib/plans/limits";
import type { Organization } from "@/types/survey";

interface OrganizationSwitcherProps {
  organizations: Organization[];
  currentId: string;
  // The user owns no organization yet: offer to create theirs (on /welcome)
  canCreate: boolean;
  // The active organization is not the user's own: they may leave it
  canLeave: boolean;
  // The active organization is the Business owner's whose plan the user is on (their name): the
  // leave dialog warns the seat ends too
  leavesPlanOf: string | null;
}

// The organizations the user is an active member of. Picking one saves it on the server (cookie) and
// the page re-renders with its data; the trigger shows a spinner meanwhile
export function OrganizationSwitcher({ organizations, currentId, canCreate, canLeave, leavesPlanOf }: OrganizationSwitcherProps) {
  const t = useTranslations("topBar");
  const tErrors = useTranslations("organizations.errors");
  const [isPending, startTransition] = useTransition();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [isLeaving, startLeaving] = useTransition();
  const selected = organizations.find((o) => o.id === currentId) ?? organizations[0];

  function select(id: string) {
    if (id === selected.id) return;
    startTransition(async () => {
      const result = await switchOrganization(id);
      if (!result.success) toast.error(t("organizationSwitchError"));
    });
  }

  // Leaving redirects to the next organization (or /welcome); only errors come back
  function leave() {
    startLeaving(async () => {
      const result = await leaveOrganization();
      setLeaveOpen(false);
      if (!result.success) toast.error(tErrors(result.error.code, { max: MAX_MEMBERSHIPS }));
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={isPending}
            aria-busy={isPending}
            aria-label={t("organizationLabel", { name: selected.name })}
            className="h-11 gap-2 rounded-full bg-card px-4 text-[0.95rem] font-normal shadow-xs"
          >
            {isPending ? (
              <Loader2Icon aria-hidden className="-mx-0.5 size-3.5 animate-spin text-muted-foreground" />
            ) : (
              <span aria-hidden className="size-2.5 rounded-full bg-success" />
            )}
            <span className="hidden max-w-40 truncate @3xl:inline">{selected.name}</span>
            <ChevronDownIcon aria-hidden className="text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52 rounded-xl">
          <DropdownMenuLabel>{t("organizations")}</DropdownMenuLabel>
          {organizations.map((organization) => (
            <DropdownMenuItem key={organization.id} onSelect={() => select(organization.id)}>
              <span className="truncate">{organization.name}</span>
              {organization.id === selected.id && <CheckIcon aria-hidden className="ml-auto" />}
            </DropdownMenuItem>
          ))}
          {canCreate && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={WELCOME_PATH}>
                  <PlusIcon aria-hidden />
                  {t("createOrganization")}
                </Link>
              </DropdownMenuItem>
            </>
          )}
          {canLeave && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setLeaveOpen(true)}>
                <LogOutIcon aria-hidden />
                {t("leaveOrganization", { name: selected.name })}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <UserConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title={t("leaveTitle", { name: selected.name })}
        description={leavesPlanOf !== null ? `${t("leaveDescription")} ${t("leavePlanNote", { owner: leavesPlanOf })}` : t("leaveDescription")}
        confirmLabel={t("leaveConfirm")}
        pendingLabel={t("leavePending")}
        isPending={isLeaving}
        onConfirm={leave}
      />
    </>
  );
}
