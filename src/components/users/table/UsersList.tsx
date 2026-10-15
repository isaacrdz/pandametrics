"use client";

import { useTranslations } from "next-intl";
import { TableCheckbox } from "@/components/table/TableCheckbox";
import { UpdatedAt } from "@/components/table/UpdatedAt";
import { UserAvatar } from "@/components/users/UserAvatar";
import type { UserRowControls } from "@/components/users/table/row-controls";
import { UserActionsMenu } from "@/components/users/table/UserActionsMenu";
import { UserName, UserPhone, UserRoleBadge, UserStatusPill } from "@/components/users/table/UserRowParts";
import type { UserRow } from "@/lib/users/list";

interface UsersListProps {
  rows: UserRow[];
  now: string;
  controls: UserRowControls;
}

// Card narrower than 42rem: a wide table would hide the status behind a horizontal scroll, so rows stack
export function UsersList({ rows, now, controls }: UsersListProps) {
  const t = useTranslations("users");

  return (
    <ul aria-label={t("caption")} className="divide-y divide-card-border">
      {rows.map((row) => (
        <li
          key={row.id}
          className={`flex flex-col gap-3 py-4 pr-3 pl-5 ${controls.isSelected(row.id) ? "bg-accent/60" : ""}`}
        >
          <div className="flex items-center gap-3">
            <TableCheckbox
              checked={controls.isSelected(row.id)}
              disabled={row.isCurrentUser}
              onCheckedChange={(checked) => controls.onToggle(row.id, checked === true)}
              aria-label={row.isCurrentUser ? t("select.self") : t("select.row", { name: row.name })}
            />
            <UserAvatar image={row.image} initials={row.initials} />
            <UserName row={row} className="flex-1" />
            <UserActionsMenu row={row} onDeactivate={controls.onDeactivate} />
          </div>
          <div className="flex flex-wrap items-center gap-2 pr-2 pl-[4.875rem]">
            <UserRoleBadge role={row.role} />
            <UserStatusPill isActive={row.isActive} />
            {/* Only when there is one: a lone dash would float at the end of the line */}
            {row.phone && (
              <span className="ml-auto text-sm text-muted-foreground">
                <UserPhone phone={row.phone} />
              </span>
            )}
          </div>
          <p className="flex flex-wrap gap-x-1.5 pl-[4.875rem] text-sm text-muted-foreground">
            <span>{t("columns.updated")}</span>
            <span aria-hidden>·</span>
            <UpdatedAt updatedAt={row.updatedAt} now={now} />
          </p>
        </li>
      ))}
    </ul>
  );
}
