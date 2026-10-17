"use client";

import { useEffect, useRef, useState } from "react";
import { searchWorkspace } from "@/actions/search";
import type { SearchGroup, SearchResults, SurveyHit } from "@/lib/search/types";

const DEBOUNCE_MS = 200;

type Reply = { query: string; ok: true; data: SearchResults } | { query: string; ok: false };

export interface WorkspaceSearch {
  // Blank query: the most recently updated surveys (fetched once per opening)
  recent: SearchGroup<SurveyHit> | null;
  // The last successful results for a typed query; kept while the next one loads
  results: SearchResults | null;
  // A request for the current query is pending
  loading: boolean;
  // The current query failed (rate limited, offline, server error)
  failed: boolean;
}

// The palette's server search: debounced, and only the reply to the latest query is applied, so a
// slow answer for "sto" never replaces the one for "store". Lives in the palette's content, which
// unmounts on close, so every opening starts fresh. `enabled` is false without an organization
export function useWorkspaceSearch(query: string, enabled: boolean): WorkspaceSearch {
  const trimmed = query.trim();
  const [reply, setReply] = useState<Reply | null>(null);
  const [recent, setRecent] = useState<SearchGroup<SurveyHit> | null>(null);
  const [results, setResults] = useState<SearchResults | null>(null);
  // Incremented for every query; a reply whose id is no longer the latest is dropped
  const latest = useRef(0);

  const answered = reply?.query === trimmed || (trimmed === "" && recent !== null);

  useEffect(() => {
    const id = ++latest.current;
    if (!enabled || answered) return;

    const timer = setTimeout(
      async () => {
        const result = await searchWorkspace(trimmed).catch(() => null);
        if (id !== latest.current) return;
        if (!result?.success) {
          setReply({ query: trimmed, ok: false });
          return;
        }
        setReply({ query: trimmed, ok: true, data: result.data });
        if (trimmed === "") setRecent(result.data.surveys);
        else setResults(result.data);
      },
      trimmed ? DEBOUNCE_MS : 0,
    );
    return () => clearTimeout(timer);
  }, [enabled, trimmed, answered]);

  return {
    recent,
    results,
    loading: enabled && !answered,
    failed: enabled && reply?.query === trimmed && !reply.ok,
  };
}
