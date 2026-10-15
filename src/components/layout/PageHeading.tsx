"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// The bar's h1 has a stable id, so sections can be labelled by it
export const PAGE_TITLE_ID = "page-title";

interface PageHeadingProps {
  title: string;
  subtitle?: string;
  // Total items on list pages
  count?: number;
  // Detail and form pages: a link, or a handler (e.g. to confirm unsaved changes first)
  back?: { href: string } | { onClick: () => void };
}

// Left side of the top bar on every view but the dashboard: the page's h1 and the text under it
export function PageHeading({ title, subtitle, count, back }: PageHeadingProps) {
  const t = useTranslations("form.actions");
  const format = useFormatter();
  const backClass = "size-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground";

  return (
    <div className="flex min-w-0 items-center gap-2 @3xl:gap-3">
      {back && (
        <Tooltip>
          <TooltipTrigger asChild>
            {"href" in back ? (
              <Button asChild variant="ghost" size="icon" className={backClass}>
                <Link href={back.href} aria-label={t("back")}>
                  <ArrowLeftIcon aria-hidden />
                </Link>
              </Button>
            ) : (
              <Button type="button" variant="ghost" size="icon" aria-label={t("back")} onClick={back.onClick} className={backClass}>
                <ArrowLeftIcon aria-hidden />
              </Button>
            )}
          </TooltipTrigger>
          <TooltipContent>{t("back")}</TooltipContent>
        </Tooltip>
      )}
      <div className="min-w-0">
        {/* The count sits next to the h1, not inside it, so the heading's name is just the title */}
        <div className="flex min-w-0 items-baseline gap-2">
          <h1 id={PAGE_TITLE_ID} title={title} className="truncate text-xl font-semibold text-foreground @3xl:text-2xl">
            {title}
          </h1>
          {/* Hidden on phones: the title needs the room, and the list says "Showing X–Y of Z" */}
          {count !== undefined && (
            <span className="hidden shrink-0 text-base font-medium text-muted-foreground tabular-nums @md:inline @3xl:text-lg">
              {format.number(count)}
            </span>
          )}
        </div>
        {subtitle && <p className="hidden truncate text-sm text-muted-foreground @md:block">{subtitle}</p>}
      </div>
    </div>
  );
}
