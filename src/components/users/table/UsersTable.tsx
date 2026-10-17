"use client";

import { useTranslations } from "next-intl";
import { TableCheckbox } from "@/components/table/TableCheckbox";
import { UpdatedAt } from "@/components/table/UpdatedAt";
import { UserAvatar } from "@/components/users/UserAvatar";
import type { UserRowControls } from "@/components/users/table/row-controls";
import { UserActionsMenu } from "@/components/users/table/UserActionsMenu";
import { UserName, UserPhone, UserRoleBadge, UserStatusPill } from "@/components/users/table/UserRowParts";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { UserRow } from "@/lib/users/list";

const HEAD_CLASS = "h-12 px-4 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase";

interface UsersTableProps {
  rows: UserRow[];
  now: string;
  controls: UserRowControls;
}

// Card at least 42rem wide (@2xl). Below 56rem (@4xl) the role moves under the name, and below
// 48rem (@3xl) the phone column is hidden (the stacked list and the edit page still show it).
export function UsersTable({ rows, now, controls }: UsersTableProps) {
  const t = useTranslations("users");

  return (
    <Table className="text-[0.95rem]">
      <TableCaption className="sr-only">{t("caption")}</TableCaption>
      <TableHeader>
        <TableRow className="border-card-border hover:bg-transparent">
          <TableHead scope="col" className="w-12 pr-0 pl-6">
            <TableCheckbox
              checked={controls.allState}
              disabled={!controls.canManage}
              onCheckedChange={(checked) => controls.onToggleAll(checked === true)}
              aria-label={t("select.all")}
            />
          </TableHead>
          <TableHead scope="col" className="w-14 px-0">
            <span className="sr-only">{t("columns.avatar")}</span>
          </TableHead>
          <TableHead scope="col" className={`${HEAD_CLASS} pl-3`}>
            {t("columns.user")}
          </TableHead>
          <TableHead scope="col" className={`${HEAD_CLASS} hidden @4xl:table-cell`}>
            {t("columns.role")}
          </TableHead>
          <TableHead scope="col" className={HEAD_CLASS}>
            {t("columns.status")}
          </TableHead>
          <TableHead scope="col" className={`${HEAD_CLASS} hidden @3xl:table-cell`}>
            {t("columns.phone")}
          </TableHead>
          <TableHead scope="col" className={HEAD_CLASS}>
            {t("columns.updated")}
          </TableHead>
          <TableHead scope="col" className="w-14 pr-4">
            <span className="sr-only">{t("columns.actions")}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.id}
            data-state={controls.isSelected(row.id) ? "selected" : undefined}
            className="border-card-border hover:bg-accent/40 data-[state=selected]:bg-accent/60"
          >
            <TableCell className="w-12 py-4 pr-0 pl-6">
              <TableCheckbox
                checked={controls.isSelected(row.id)}
                // The signed-in user and the owner can never be deactivated or removed from here
                disabled={!controls.canManage || row.isCurrentUser || row.isOwner}
                onCheckedChange={(checked) => controls.onToggle(row.id, checked === true)}
                aria-label={row.isCurrentUser ? t("select.self") : row.isOwner ? t("select.owner") : t("select.row", { name: row.name })}
              />
            </TableCell>
            <TableCell className="w-14 py-4 pr-0 pl-3">
              <UserAvatar image={row.image} initials={row.initials} />
            </TableCell>
            <th scope="row" className="w-[34%] max-w-0 py-4 pr-4 pl-3 text-left font-normal">
              <div className="flex min-w-0 flex-col gap-1.5">
                <UserName row={row} canManage={controls.canManage} />
                <span className="@4xl:hidden">
                  <UserRoleBadge role={row.role} />
                </span>
              </div>
            </th>
            <TableCell className="hidden px-4 py-4 @4xl:table-cell">
              <UserRoleBadge role={row.role} />
            </TableCell>
            <TableCell className="px-4 py-4">
              <UserStatusPill isActive={row.isActive} />
            </TableCell>
            <TableCell className="hidden px-4 py-4 @3xl:table-cell">
              <UserPhone phone={row.phone} />
            </TableCell>
            <TableCell className="px-4 py-4 text-muted-foreground">
              <UpdatedAt updatedAt={row.updatedAt} now={now} />
            </TableCell>
            <TableCell className="py-4 pr-4 text-right">
              <UserActionsMenu row={row} onDeactivate={controls.onDeactivate} canManage={controls.canManage} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
