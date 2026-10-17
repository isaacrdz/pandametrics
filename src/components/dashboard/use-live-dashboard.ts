"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

const POLL_MS = 5_000;
const VERSION_URL = "/api/v1/dashboard/version";

// Keeps the dashboard live without a reload: while the tab is visible it asks for the dashboard's
// version every few seconds and, when it changed (a kiosk answer, a survey edited elsewhere),
// refreshes the route in a transition. The cards update in place: no skeleton, and client state
// such as each card's question index is kept
export function useLiveDashboard() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const lastVersion = useRef<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let stopped = false;

    async function check() {
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch(VERSION_URL, { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const body = (await response.json()) as { success: boolean; data?: { version: string } };
        const version = body.data?.version;
        if (!version) return;
        // The first answer only sets the baseline: the page was just rendered with this data
        if (lastVersion.current !== null && version !== lastVersion.current) {
          startTransition(() => router.refresh());
        }
        lastVersion.current = version;
      } catch {
        // Offline or aborted: try again on the next tick
      }
    }

    function schedule() {
      clearTimeout(timer);
      if (stopped || document.visibilityState !== "visible") return;
      timer = setTimeout(async () => {
        await check();
        schedule();
      }, POLL_MS);
    }

    function handleVisibility() {
      if (document.visibilityState !== "visible") {
        clearTimeout(timer);
        return;
      }
      // Back on the tab: catch up at once, then keep polling
      void check().then(schedule);
    }

    void check().then(schedule);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [router]);
}
