"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchXIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { setUserActive } from "@/actions/users";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PAGE_TITLE_ID } from "@/components/layout/PageHeading";
import { TablePagination } from "@/components/table/TablePagination";
import type { UserRowControls } from "@/components/users/table/row-controls";
import { UserConfirmDialog } from "@/components/users/table/UserConfirmDialog";
import { UsersList } from "@/components/users/table/UsersList";
import { UsersTable } from "@/components/users/table/UsersTable";
import { UsersToolbar } from "@/components/users/table/UsersToolbar";
import { Button } from "@/components/ui/button";
import { useUrlSearch } from "@/hooks/use-url-search";
import type { UserListResult, UserRow } from "@/lib/users/list";
import { DEFAULT_USER_LIST_QUERY, buildUsersHref, withUserFilters, type UserListQuery } from "@/lib/users/list-params";
import { cn } from "@/lib/utils";

interface UsersTableSectionProps {
  data: UserListResult;
  params: UserListQuery;
  // Owner or admin: may select, edit and deactivate others
  canManage: boolean;
}

export function UsersTableSection({ data, params, canManage }: UsersTableSectionProps) {
  const t = useTranslations("users");
  const format = useFormatter();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const cardRef = useRef<HTMLDivElement>(null);

  // A transition keeps the current rows on screen (dimmed) until the new ones stream in
  function navigate(next: UserListQuery) {
    startTransition(() => router.replace(buildUsersHref(next), { scroll: false }));
  }

  // Changing the page or the page size brings the top of the table into view (the pager sits
  // at the bottom); filters do not move the page, since their controls are on top already
  const pageKey = `${data.page}:${data.pageSize}`;
  const previousPageKey = useRef(pageKey);
  useEffect(() => {
    if (previousPageKey.current === pageKey) return;
    previousPageKey.current = pageKey;
    const card = cardRef.current;
    if (!card || card.getBoundingClientRect().top >= 0) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    card.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
  }, [pageKey]);

  const { search, handleChange, commit } = useUrlSearch(params.query, (query) =>
    navigate(withUserFilters(params, { query })),
  );

  // Selection is per list view: changing a filter or the page starts empty, and rows that left
  // the page drop out of it. The signed-in user can never be selected.
  const listKey = buildUsersHref(params);
  const selectableIds = canManage ? data.rows.filter((row) => !row.isCurrentUser && !row.isOwner).map((row) => row.id) : [];
  const [selection, setSelection] = useState<{ key: string; ids: ReadonlySet<string> }>({ key: listKey, ids: new Set() });
  const selectedIds = selection.key === listKey ? selectableIds.filter((id) => selection.ids.has(id)) : [];

  function updateSelection(ids: string[]) {
    setSelection({ key: listKey, ids: new Set(ids) });
  }

  // Deactivating from a row menu asks first; the dialog lives here so it survives the refresh
  // The target outlives the open flag, so the title keeps the name while the dialog closes
  const [deactivateTarget, setDeactivateTarget] = useState<UserRow | null>(null);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [isDeactivating, startDeactivate] = useTransition();

  function askDeactivate(row: UserRow) {
    setDeactivateTarget(row);
    setDeactivateOpen(true);
  }

  function confirmDeactivate() {
    if (!deactivateTarget) return;
    const target = deactivateTarget;
    startDeactivate(async () => {
      const result = await setUserActive(target.id, false);
      setDeactivateOpen(false);
      if (!result.success) {
        toast.error(t(`errors.${result.error.code}`));
        return;
      }
      toast.success(t("toasts.deactivated"), { description: target.name });
    });
  }

  const controls: UserRowControls = {
    isSelected: (id) => selectedIds.includes(id),
    onToggle: (id, checked) =>
      updateSelection(checked ? [...selectedIds, id] : selectedIds.filter((selected) => selected !== id)),
    allState:
      selectedIds.length === 0 ? false : selectedIds.length === selectableIds.length ? true : "indeterminate",
    onToggleAll: (checked) => updateSelection(checked ? selectableIds : []),
    onDeactivate: askDeactivate,
    canManage,
  };

  // Announcements live in regions that stay mounted: a region that appears together with its text
  // (the pager after "no results", the selection bar) is not read by screen readers
  const resultsMessage =
    data.total === 0
      ? t("noResults.title")
      : t("pagination.showing", {
          from: format.number((data.page - 1) * data.pageSize + 1),
          to: format.number(Math.min(data.page * data.pageSize, data.total)),
          total: data.total,
        });
  const selectionMessage = selectedIds.length > 0 ? t("select.count", { count: selectedIds.length }) : "";

  return (
    // Named by the page h1, which lives in the top bar
    <section aria-labelledby={PAGE_TITLE_ID} className="flex flex-col gap-6">
      {/* Container queries, not viewport breakpoints: the sidebar takes part of the width */}
      <div
        ref={cardRef}
        aria-busy={isPending}
        className={cn(
          "@container scroll-mt-24 overflow-hidden rounded-3xl border border-card-border bg-card transition-opacity",
          isPending && "opacity-60",
        )}
      >
        <UsersToolbar
          params={params}
          search={search}
          onSearchChange={handleChange}
          commitSearch={commit}
          onNavigate={navigate}
          selectedIds={selectedIds}
          selectionHasSeats={data.rows.some((row) => row.hasBusinessSeat && selectedIds.includes(row.id))}
          onClearSelection={() => updateSelection([])}
        />
        {data.total === 0 ? (
          <EmptyState
            icon={SearchXIcon}
            title={t("noResults.title")}
            description={t("noResults.description")}
            className="rounded-none border-0"
            action={
              <Button asChild variant="outline" className="rounded-xl">
                <Link href={buildUsersHref(DEFAULT_USER_LIST_QUERY)} scroll={false}>
                  {t("noResults.clear")}
                </Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className="hidden @2xl:block">
              <UsersTable rows={data.rows} now={data.now} controls={controls} />
            </div>
            <div className="@2xl:hidden">
              <UsersList rows={data.rows} now={data.now} controls={controls} />
            </div>
            <TablePagination
              page={data.page}
              pageCount={data.pageCount}
              pageSize={data.pageSize}
              showingLabel={resultsMessage}
              hrefFor={(page) => buildUsersHref({ ...params, page })}
              onPageSizeChange={(pageSize) => navigate(withUserFilters(params, { pageSize, query: commit(search) }))}
            />
          </>
        )}
      </div>

      <p aria-live="polite" className="sr-only">
        {resultsMessage}
      </p>
      <p aria-live="polite" className="sr-only">
        {selectionMessage}
      </p>

      <UserConfirmDialog
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        title={t("deactivate.title", { name: deactivateTarget?.name ?? "" })}
        description={t("deactivate.description", { count: 1 })}
        confirmLabel={t("deactivate.confirm")}
        pendingLabel={t("deactivate.pending")}
        isPending={isDeactivating}
        onConfirm={confirmDeactivate}
      />
    </section>
  );
}
