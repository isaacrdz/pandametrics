"use client";

import { useRouter } from "next/navigation";
import { ChevronDownIcon, ListFilterIcon, SearchIcon, SlidersHorizontalIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SurveysSelectionBar } from "@/components/surveys/table/SurveysSelectionBar";
import { SURVEY_CATEGORIES } from "@/lib/surveys/constants";
import {
  SURVEY_STATUS_FILTERS,
  buildSurveysHref,
  withFilters,
  type SurveyListQuery,
  type SurveyStatusFilter,
} from "@/lib/surveys/list-params";
import { cn } from "@/lib/utils";

const FILTER_BUTTON_CLASS =
  "h-11 flex-1 gap-2 rounded-xl bg-card px-4 text-[0.95rem] font-normal @2xl:flex-none [&_svg:not([class*='size-'])]:size-4";

// Highlighted while the filter narrows the list
const FILTER_ACTIVE_CLASS = "border-primary/60 text-primary hover:text-primary";

interface SurveysToolbarProps {
  params: SurveyListQuery;
  // Search state lives in the section, so the range select can include a pending search too
  search: string;
  onSearchChange: (value: string) => void;
  commitSearch: (value: string) => string;
  // While rows are selected, the bulk actions replace the filters
  selectedIds: string[];
  onClearSelection: () => void;
}

export function SurveysToolbar({
  params,
  search,
  onSearchChange,
  commitSearch,
  selectedIds,
  onClearSelection,
}: SurveysToolbarProps) {
  const t = useTranslations("surveys");
  const tCategories = useTranslations("categories");
  const router = useRouter();

  function navigate(next: SurveyListQuery) {
    router.replace(buildSurveysHref(next), { scroll: false });
  }

  // A filter picked while a search is still pending writes both
  function applyFilter(changes: Partial<Pick<SurveyListQuery, "categories" | "status">>) {
    navigate(withFilters(params, { ...changes, query: commitSearch(search) }));
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
      <div className="relative w-full min-w-0 @2xl:max-w-sm @2xl:flex-1">
        <SearchIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("toolbar.search")}
          aria-label={t("toolbar.search")}
          className="h-11 w-full rounded-xl bg-card pl-10 text-[0.95rem]"
        />
      </div>

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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                aria-label={t("toolbar.statusLabel", { status: statusName(params.status) })}
                className={cn(FILTER_BUTTON_CLASS, params.status !== "all" && FILTER_ACTIVE_CLASS)}
              >
                <ListFilterIcon aria-hidden />
                {t("toolbar.status")}
                {params.status !== "all" && <span className="font-semibold">· {statusName(params.status)}</span>}
                <ChevronDownIcon aria-hidden className="ml-auto text-muted-foreground @2xl:ml-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44 rounded-xl">
              <DropdownMenuLabel>{t("toolbar.status")}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={params.status}
                onValueChange={(value) =>
                  applyFilter({ status: SURVEY_STATUS_FILTERS.find((s) => s === value) ?? "all" })
                }
              >
                {SURVEY_STATUS_FILTERS.map((status) => (
                  <DropdownMenuRadioItem key={status} value={status}>
                    {statusName(status)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
