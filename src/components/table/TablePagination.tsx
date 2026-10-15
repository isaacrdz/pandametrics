"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAGE_SIZE_OPTIONS, getPageItems, type PageSize } from "@/lib/table/pagination";
import { cn } from "@/lib/utils";

const ELLIPSIS = "…";

const PAGE_CLASS =
  "flex size-10 items-center justify-center rounded-xl text-sm font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card";

interface TablePaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  // "Showing 1–5 of 8 users": the noun belongs to each list
  showingLabel: string;
  hrefFor: (page: number) => string;
  onPageSizeChange: (pageSize: PageSize) => void;
}

// Rows per page and page links under a table; pages are links, so they work without JavaScript
export function TablePagination({ page, pageCount, pageSize, showingLabel, hrefFor, onPageSizeChange }: TablePaginationProps) {
  const t = useTranslations("table.pagination");
  const format = useFormatter();

  return (
    <div className="flex flex-col items-center gap-3 border-t border-card-border px-4 py-4 @2xl:flex-row @2xl:justify-between @2xl:px-6">
      {/* Announced through the section's live region, which stays mounted */}
      <p className="text-sm text-muted-foreground">
        {showingLabel}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span aria-hidden>{t("rowsPerPage")}</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              const next = PAGE_SIZE_OPTIONS.find((option) => String(option) === value);
              if (next) onPageSizeChange(next);
            }}
          >
            <SelectTrigger
              aria-label={t("rowsPerPage")}
              className="h-10! w-20 rounded-xl bg-card text-sm font-semibold text-foreground tabular-nums"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" className="min-w-20 rounded-xl">
              {PAGE_SIZE_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {format.number(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Always shown, as in the reference: with one page both arrows are disabled */}
        <nav aria-label={t("label")}>
          <ul className="flex items-center gap-1.5">
            <li>
              <PagerArrow href={page > 1 ? hrefFor(page - 1) : null} label={t("previous")}>
                <ChevronLeftIcon aria-hidden className="size-4" />
              </PagerArrow>
            </li>
            {getPageItems(page, pageCount).map((item) =>
              typeof item === "number" ? (
                <li key={item}>
                  <Link
                    href={hrefFor(item)}
                    scroll={false}
                    aria-label={t("page", { page: item })}
                    aria-current={item === page ? "page" : undefined}
                    className={cn(
                      PAGE_CLASS,
                      item === page
                        ? "bg-primary text-primary-foreground"
                        : "border border-card-border bg-card text-foreground hover:bg-accent",
                    )}
                  >
                    {format.number(item)}
                  </Link>
                </li>
              ) : (
                <li key={item} aria-hidden className="flex size-10 items-center justify-center text-muted-foreground">
                  {ELLIPSIS}
                </li>
              ),
            )}
            <li>
              <PagerArrow href={page < pageCount ? hrefFor(page + 1) : null} label={t("next")}>
                <ChevronRightIcon aria-hidden className="size-4" />
              </PagerArrow>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}

// A link while there is a page to go to; at the ends, a disabled element that keeps its place
function PagerArrow({ href, label, children }: { href: string | null; label: string; children: ReactNode }) {
  const className = cn(PAGE_CLASS, "border border-card-border bg-card text-foreground");

  if (!href) {
    return (
      <span role="link" aria-disabled="true" aria-label={label} className={cn(className, "opacity-40")}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} scroll={false} aria-label={label} className={cn(className, "hover:bg-accent")}>
      {children}
    </Link>
  );
}
