"use client";

import { useState, type ReactNode, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, ListIcon, PlusIcon, SmileIcon, StarIcon, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAppShell } from "@/components/layout/AppShellProvider";
import { usePaletteEntries, type PaletteEntry } from "@/components/search/use-palette-entries";
import { useWorkspaceSearch } from "@/components/search/use-workspace-search";
import { StatusPill } from "@/components/table/StatusPill";
import { UserAvatar } from "@/components/users/UserAvatar";
import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { newSurveyHref, personHref, seeAllHref, surveyHref } from "@/lib/search/destinations";
import { highlightMatch } from "@/lib/search/match";
import { SEARCH_GROUP_LIMIT, SEARCH_QUERY_MAX, type PersonHit, type SearchGroup, type SurveyHit } from "@/lib/search/types";
import { SURVEY_DOT_COLORS } from "@/lib/surveys/colors";
import type { SurveyCategory } from "@/types/survey";

const CATEGORY_ICONS: Record<SurveyCategory, LucideIcon> = {
  SATISFACTION: SmileIcon,
  RATING: StarIcon,
  POLL: ListIcon,
};

const ITEM_CLASS = "min-h-11 gap-3 px-3 py-2";

// The part of the text that matches the query, in the primary color (accents and case ignored)
function Highlighted({ text, query }: { text: string; query: string }) {
  const parts = highlightMatch(text, query);
  if (!parts) return <>{text}</>;
  return (
    <>
      {parts.before}
      <mark className="bg-transparent font-semibold text-primary">{parts.match}</mark>
      {parts.after}
    </>
  );
}

function LoadingRow({ label }: { label: string }) {
  return (
    <div role="status" className="flex min-h-11 items-center gap-3 px-3 text-sm text-muted-foreground">
      <span aria-hidden className="size-2 animate-pulse rounded-full bg-muted-foreground/60" />
      {label}
    </div>
  );
}

function MessageRow({ children }: { children: ReactNode }) {
  return <p className="px-3 py-2 text-sm text-muted-foreground">{children}</p>;
}

interface PaletteBodyProps {
  close: () => void;
}

// The dialog's content. Mounted only while the dialog is (Radix), so the query and the results
// start empty on every opening. Filtering is ours (shouldFilter false): the server ranks surveys and people, the
// matcher ranks pages and actions
function PaletteBody({ close }: PaletteBodyProps) {
  const t = useTranslations("search");
  const tSurveys = useTranslations("surveys.status");
  const tCategories = useTranslations("categories");
  const tUsers = useTranslations("users");
  const router = useRouter();
  const { currentOrganizationId, role } = useAppShell();
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  const hasOrganization = currentOrganizationId !== null;
  const canManage = role === "OWNER" || role === "ADMIN";

  const search = useWorkspaceSearch(query, hasOrganization);
  const { pages, actions } = usePaletteEntries(query);

  function go(href: string) {
    close();
    router.push(href);
  }

  function runEntry(entry: PaletteEntry) {
    close();
    entry.run();
  }

  const isBlank = trimmed === "";
  const surveys: SearchGroup<SurveyHit> | null = isBlank ? search.recent : (search.results?.surveys ?? null);
  const people: SearchGroup<PersonHit> | null = isBlank ? null : (search.results?.people ?? null);
  const showSurveyGroup = hasOrganization && (search.loading || search.failed || (surveys?.hits.length ?? 0) > 0);
  const showPeopleGroup = hasOrganization && !isBlank && (search.loading || search.failed || (people?.hits.length ?? 0) > 0);
  const surveyHits = search.failed ? [] : (surveys?.hits ?? []);
  const peopleHits = search.failed || isBlank ? [] : (people?.hits ?? []);
  const surveysMore = !isBlank && !search.failed && (surveys?.total ?? 0) > SEARCH_GROUP_LIMIT;
  const peopleMore = !search.failed && (people?.total ?? 0) > SEARCH_GROUP_LIMIT;

  const nothingFound =
    !isBlank && !search.loading && !search.failed && surveyHits.length === 0 && peopleHits.length === 0 && pages.length === 0 && actions.length === 0;
  const resultCount =
    surveyHits.length + peopleHits.length + pages.length + actions.length + (surveysMore ? 1 : 0) + (peopleMore ? 1 : 0);

  return (
    <Command shouldFilter={false} loop className="rounded-none! p-0">
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder={t("placeholder")}
        maxLength={SEARCH_QUERY_MAX}
        className="h-11 text-base"
      />
      <p aria-live="polite" className="sr-only">
        {search.loading ? t("loading") : t("results", { count: nothingFound ? 0 : resultCount })}
      </p>
      <CommandList className="max-h-[min(28rem,60vh)] p-1">
        {showSurveyGroup && (
          <CommandGroup heading={isBlank ? t("groups.recent") : t("groups.surveys")}>
            {search.failed && <MessageRow>{t("unavailable")}</MessageRow>}
            {search.loading && surveyHits.length === 0 && <LoadingRow label={t("loading")} />}
            {surveyHits.map((survey) => {
              const CategoryIcon = CATEGORY_ICONS[survey.category];
              return (
                <CommandItem key={survey.id} value={`survey:${survey.id}`} onSelect={() => go(surveyHref(survey.id))} className={ITEM_CLASS}>
                  <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: SURVEY_DOT_COLORS[survey.colorIndex] }} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">
                      <Highlighted text={survey.name} query={trimmed} />
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="font-mono tracking-wider uppercase">{survey.code}</span>
                      <span aria-hidden>·</span>
                      <CategoryIcon aria-hidden className="size-3.5" />
                      {tCategories(`${survey.category}.title`)}
                    </span>
                  </span>
                  <StatusPill tone={survey.isActive ? "success" : "muted"} label={tSurveys(survey.isActive ? "ACTIVE" : "DRAFT")} />
                </CommandItem>
              );
            })}
            {surveysMore && surveys && (
              <CommandItem value="see-all:surveys" onSelect={() => go(seeAllHref("surveys", trimmed))} className={ITEM_CLASS}>
                <ArrowRightIcon aria-hidden className="text-muted-foreground" />
                {t("seeAll", { count: surveys.total })}
              </CommandItem>
            )}
          </CommandGroup>
        )}

        {showPeopleGroup && (
          <CommandGroup heading={t("groups.people")}>
            {search.failed && <MessageRow>{t("unavailable")}</MessageRow>}
            {search.loading && peopleHits.length === 0 && <LoadingRow label={t("loading")} />}
            {peopleHits.map((person) => (
              <CommandItem key={person.id} value={`person:${person.id}`} onSelect={() => go(personHref(person, canManage))} className={ITEM_CLASS}>
                <UserAvatar image={person.image} initials={person.initials} className="size-8" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium">
                      <Highlighted text={person.name} query={trimmed} />
                    </span>
                    {person.isCurrentUser && (
                      <span className="shrink-0 rounded-md border border-card-border px-1.5 py-0.5 text-[0.7rem] font-semibold text-muted-foreground">
                        {tUsers("you")}
                      </span>
                    )}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{person.email}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {!person.isActive && <StatusPill tone="muted" label={t("inactive")} />}
                  <span className="hidden text-xs text-muted-foreground sm:inline">{tUsers(`roles.${person.role}`)}</span>
                </span>
              </CommandItem>
            ))}
            {peopleMore && people && (
              <CommandItem value="see-all:people" onSelect={() => go(seeAllHref("people", trimmed))} className={ITEM_CLASS}>
                <ArrowRightIcon aria-hidden className="text-muted-foreground" />
                {t("seeAll", { count: people.total })}
              </CommandItem>
            )}
          </CommandGroup>
        )}

        {nothingFound && (
          <div className="flex flex-col gap-1 py-2">
            <MessageRow>{t("noResults", { query: trimmed })}</MessageRow>
            {hasOrganization && (
              <CommandGroup>
                <CommandItem value="action:new-survey-named" onSelect={() => go(newSurveyHref(trimmed))} className={ITEM_CLASS}>
                  <PlusIcon aria-hidden className="text-muted-foreground" />
                  <span className="truncate">{t("newSurveyNamed", { query: trimmed })}</span>
                </CommandItem>
              </CommandGroup>
            )}
          </div>
        )}

        {(showSurveyGroup || showPeopleGroup) && pages.length + actions.length > 0 && <CommandSeparator className="my-1" />}

        {pages.length > 0 && (
          <CommandGroup heading={t("groups.pages")}>
            {pages.map((entry) => (
              <CommandItem key={entry.id} value={entry.id} onSelect={() => runEntry(entry)} className={ITEM_CLASS}>
                <entry.icon aria-hidden className="text-muted-foreground" />
                <span className="flex-1 truncate">{entry.label}</span>
                {entry.count !== undefined && (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">{entry.count}</span>
                )}
                {entry.current && <span className="text-xs text-muted-foreground">{t("currentPage")}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {actions.length > 0 && (
          <CommandGroup heading={t("groups.actions")}>
            {actions.map((entry) => (
              <CommandItem key={entry.id} value={entry.id} onSelect={() => runEntry(entry)} className={ITEM_CLASS}>
                <entry.icon aria-hidden className="text-muted-foreground" />
                <span className="flex-1 truncate">{entry.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // What had focus before opening; it gets it back on close while it is still on the page (after a
  // navigation it is gone and the new page keeps its own focus)
  returnFocusRef: RefObject<HTMLElement | null>;
}

export function CommandPalette({ open, onOpenChange, returnFocusRef }: CommandPaletteProps) {
  const t = useTranslations("search");

  function restoreFocus(event: Event) {
    const element = returnFocusRef.current;
    returnFocusRef.current = null;
    if (!element?.isConnected) return;
    event.preventDefault();
    element.focus();
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description")}
      className="top-[12vh] gap-0 sm:max-w-xl"
      onCloseAutoFocus={restoreFocus}
    >
      {/* Radix unmounts the content after the closing animation, so every opening starts empty */}
      <PaletteBody close={() => onOpenChange(false)} />
    </CommandDialog>
  );
}
