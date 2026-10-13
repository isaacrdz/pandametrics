"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_RANGE, RANGE_KEYS, parseRange, type RangeKey } from "@/lib/date-range";

const SEARCH_DEBOUNCE_MS = 300;

interface CollectionsToolbarProps {
  query: string;
  range: RangeKey;
}

export function CollectionsToolbar({ query, range }: CollectionsToolbarProps) {
  const t = useTranslations("dashboard.toolbar");
  const tRange = useTranslations("dateRange");
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(query);
  // Last query this toolbar wrote to the URL
  const [pushedQuery, setPushedQuery] = useState(query);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // The URL changed from outside (e.g. "Clear search"): sync the input
  if (query !== pushedQuery) {
    setPushedQuery(query);
    setSearch(query);
  }

  function updateUrl(next: { q: string; range: RangeKey }) {
    const q = next.q.trim();
    setPushedQuery(q);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (next.range !== DEFAULT_RANGE) params.set("range", next.range);
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }

  function handleSearch(value: string) {
    setSearch(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => updateUrl({ q: value, range }), SEARCH_DEBOUNCE_MS);
  }

  return (
    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
      <div className="relative">
        <SearchIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => handleSearch(event.target.value)}
          placeholder={t("search")}
          aria-label={t("search")}
          className="h-11 w-full rounded-full bg-card pl-10 text-[0.95rem] sm:w-60"
        />
      </div>
      <Select value={range} onValueChange={(value) => updateUrl({ q: search, range: parseRange(value) })}>
        <SelectTrigger
          aria-label={t("range")}
          className="h-11! w-full gap-2 rounded-full bg-card px-4 text-[0.95rem] sm:w-48"
        >
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-highlight" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end" className="rounded-xl">
          {RANGE_KEYS.map((key) => (
            <SelectItem key={key} value={key}>
              {tRange(key)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
