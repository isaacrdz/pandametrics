"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { StatusPill } from "@/components/table/StatusPill";
import type { UserRow } from "@/lib/users/list";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/survey";

// Placeholder for "no phone", the same in every language
const EMPTY_VALUE = "—";

// Cell contents shared by the table and the stacked list

export function UserName({ row, className }: { row: UserRow; className?: string }) {
  const t = useTranslations("users");

  return (
    <span className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <span className="flex min-w-0 items-center gap-2">
        <Link
          href={`/users/${row.id}`}
          title={row.name}
          className="truncate rounded-sm font-semibold text-foreground outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          {row.name}
        </Link>
        {row.isCurrentUser && (
          <span className="shrink-0 rounded-md border border-card-border px-1.5 py-0.5 text-[0.7rem] font-semibold text-muted-foreground">
            {t("you")}
          </span>
        )}
      </span>
      <span title={row.email} className="truncate text-sm text-muted-foreground">
        {row.email}
      </span>
    </span>
  );
}

export function UserRoleBadge({ role }: { role: Role }) {
  const t = useTranslations("users.roles");

  return (
    <span className="inline-flex w-fit items-center rounded-md bg-accent px-2 py-0.5 text-xs font-medium whitespace-nowrap text-primary">
      {t(role)}
    </span>
  );
}

export function UserStatusPill({ isActive }: { isActive: boolean }) {
  const t = useTranslations("users.status");
  return <StatusPill tone={isActive ? "success" : "muted"} label={t(isActive ? "ACTIVE" : "INACTIVE")} />;
}

export function UserPhone({ phone }: { phone: string | null }) {
  const t = useTranslations("users");

  if (!phone) {
    return (
      <span role="img" aria-label={t("noPhone")} className="text-muted-foreground">
        {EMPTY_VALUE}
      </span>
    );
  }
  return <span className="whitespace-nowrap tabular-nums">{phone}</span>;
}
