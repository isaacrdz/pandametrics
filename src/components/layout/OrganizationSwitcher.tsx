"use client";

import { useTransition } from "react";
import Link from "next/link";
import { CheckIcon, ChevronDownIcon, Loader2Icon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { switchOrganization } from "@/actions/organizations";
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
import type { Organization } from "@/types/survey";

interface OrganizationSwitcherProps {
  organizations: Organization[];
  currentId: string;
  // The user owns no organization yet: offer to create theirs (on /welcome)
  canCreate: boolean;
}

// The organizations the user is an active member of. Picking one saves it on the server (cookie) and
// the page re-renders with its data; the trigger shows a spinner meanwhile
export function OrganizationSwitcher({ organizations, currentId, canCreate }: OrganizationSwitcherProps) {
  const t = useTranslations("topBar");
  const [isPending, startTransition] = useTransition();
  const selected = organizations.find((o) => o.id === currentId) ?? organizations[0];

  function select(id: string) {
    if (id === selected.id) return;
    startTransition(async () => {
      const result = await switchOrganization(id);
      if (!result.success) toast.error(t("organizationSwitchError"));
    });
  }

  return (
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
