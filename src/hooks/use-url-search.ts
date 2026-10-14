"use client";

import { useEffect, useRef, useState } from "react";

const SEARCH_DEBOUNCE_MS = 300;

// Search input backed by a URL param: typing is debounced before `onSearch` writes the URL,
// and the input follows the URL when it changes from outside (e.g. "Clear filters").
export function useUrlSearch(query: string, onSearch: (query: string) => void) {
  const [search, setSearch] = useState(query);
  // Last query this input wrote to the URL
  const [pushedQuery, setPushedQuery] = useState(query);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // The debounced write uses the latest callback, so it never restores params that changed
  // while the user was typing
  const onSearchRef = useRef(onSearch);

  useEffect(() => {
    onSearchRef.current = onSearch;
  });

  if (query !== pushedQuery) {
    setPushedQuery(query);
    setSearch(query);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  // Cancels a pending search and returns the trimmed text, for writes that include it
  // together with other params (e.g. changing the range while typing)
  function commit(value: string): string {
    clearTimeout(timer.current);
    const trimmed = value.trim();
    setPushedQuery(trimmed);
    return trimmed;
  }

  function handleChange(value: string) {
    setSearch(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearchRef.current(commit(value)), SEARCH_DEBOUNCE_MS);
  }

  return { search, handleChange, commit };
}
