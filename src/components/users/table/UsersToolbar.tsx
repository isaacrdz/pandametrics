"use client";

import { useTranslations } from "next-intl";
import { FilterMenu } from "@/components/table/FilterMenu";
import { TableSearch } from "@/components/table/TableSearch";
import { UsersSelectionBar } from "@/components/users/table/UsersSelectionBar";
import { USER_STATUS_FILTERS, withUserFilters, type UserListQuery, type UserStatusFilter } from "@/lib/users/list-params";

interface UsersToolbarProps {
  params: UserListQuery;
  search: string;
  onSearchChange: (value: string) => void;
  commitSearch: (value: string) => string;
  // Every list change goes through the section, which shows it as pending
  onNavigate: (next: UserListQuery) => void;
  // While rows are selected, the bulk actions replace the filter
  selectedIds: string[];
  onClearSelection: () => void;
}

export function UsersToolbar({
  params,
  search,
  onSearchChange,
  commitSearch,
  onNavigate,
  selectedIds,
  onClearSelection,
}: UsersToolbarProps) {
  const t = useTranslations("users");

  const statusName = (status: UserStatusFilter) =>
    status === "all" ? t("toolbar.statusAll") : t(`status.${status === "active" ? "ACTIVE" : "INACTIVE"}`);

  return (
    <div className="flex flex-col gap-3 border-b border-card-border p-4 @2xl:flex-row @2xl:items-center @2xl:justify-between @2xl:px-6">
      <TableSearch value={search} onChange={onSearchChange} label={t("toolbar.search")} />

      {selectedIds.length > 0 ? (
        <UsersSelectionBar ids={selectedIds} onDone={onClearSelection} />
      ) : (
        <div className="flex gap-3">
          <FilterMenu
            label={t("toolbar.status")}
            triggerLabel={t("toolbar.statusLabel", { status: statusName(params.status) })}
            options={USER_STATUS_FILTERS.map((status) => ({ value: status, label: statusName(status) }))}
            value={params.status}
            defaultValue="all"
            // A filter picked while a search is still pending writes both
            onChange={(status) => onNavigate(withUserFilters(params, { status, query: commitSearch(search) }))}
          />
        </div>
      )}
    </div>
  );
}
