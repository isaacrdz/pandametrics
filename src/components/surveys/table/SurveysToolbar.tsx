"use client";

import { ChevronDownIcon, SlidersHorizontalIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SurveysSelectionBar } from "@/components/surveys/table/SurveysSelectionBar";
import { FILTER_ACTIVE_CLASS, FILTER_BUTTON_CLASS, FilterMenu } from "@/components/table/FilterMenu";
import { TableSearch } from "@/components/table/TableSearch";
import { SURVEY_CATEGORIES } from "@/lib/surveys/constants";
import {
  SURVEY_STATUS_FILTERS,
  withFilters,
  type SurveyListQuery,
  type SurveyStatusFilter,
} from "@/lib/surveys/list-params";
import { cn } from "@/lib/utils";

interface SurveysToolbarProps {
  params: SurveyListQuery;
  // Search state lives in the section, so the range select can include a pending search too
  search: string;
  onSearchChange: (value: string) => void;
  commitSearch: (value: string) => string;
  // Every list change goes through the section, which shows it as pending
  onNavigate: (next: SurveyListQuery) => void;
  // While rows are selected, the bulk actions replace the filters
  selectedIds: string[];
  onClearSelection: () => void;
}

export function SurveysToolbar({
  params,
  search,
  onSearchChange,
  commitSearch,
  onNavigate,
  selectedIds,
  onClearSelection,
}: SurveysToolbarProps) {
  const t = useTranslations("surveys");
  const tCategories = useTranslations("categories");
  // A filter picked while a search is still pending writes both
  function applyFilter(changes: Partial<Pick<SurveyListQuery, "categories" | "status">>) {
    onNavigate(withFilters(params, { ...changes, query: commitSearch(search) }));
  }

  function toggleCategory(category: SurveyListQuery["categories"][number], checked: boolean) {
    const categories = checked
      ? SURVEY_CATEGORIES.filter((value) => value === category || params.categories.includes(value))
      : params.categories.filter((value) => value !== category);
    applyFilter({ categories });
  }

  const statusName = (status: SurveyStatusFilter) =>
    status === "all" ? t("toolbar.statusAll") : t(`status.${status === "active" ? "ACTIVE" : "DRAFT"}`);
  const typeCount = params.categories.length;

  return (
    <div className="flex flex-col gap-3 border-b border-card-border p-4 @2xl:flex-row @2xl:items-center @2xl:justify-between @2xl:px-6">
      <TableSearch value={search} onChange={onSearchChange} label={t("toolbar.search")} />

      {selectedIds.length > 0 ? (
        <SurveysSelectionBar ids={selectedIds} onDone={onClearSelection} />
      ) : (
        <div className="flex gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                aria-label={t("toolbar.typeLabel", { count: typeCount })}
                className={cn(FILTER_BUTTON_CLASS, typeCount > 0 && FILTER_ACTIVE_CLASS)}
              >
                <SlidersHorizontalIcon aria-hidden />
                {t("toolbar.type")}
                {typeCount > 0 && <span className="font-semibold tabular-nums">· {typeCount}</span>}
                <ChevronDownIcon aria-hidden className="ml-auto text-muted-foreground @2xl:ml-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48 rounded-xl">
              <DropdownMenuLabel>{t("toolbar.type")}</DropdownMenuLabel>
              {SURVEY_CATEGORIES.map((category) => (
                <DropdownMenuCheckboxItem
                  key={category}
                  checked={params.categories.includes(category)}
                  onCheckedChange={(checked) => toggleCategory(category, checked)}
                  // Keep the menu open: several types can be picked in a row
                  onSelect={(event) => event.preventDefault()}
                >
                  {tCategories(`${category}.title`)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <FilterMenu
            label={t("toolbar.status")}
            triggerLabel={t("toolbar.statusLabel", { status: statusName(params.status) })}
            options={SURVEY_STATUS_FILTERS.map((status) => ({ value: status, label: statusName(status) }))}
            value={params.status}
            defaultValue="all"
            onChange={(status) => applyFilter({ status })}
          />
        </div>
      )}
    </div>
  );
}
