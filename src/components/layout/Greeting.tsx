"use client";

import { useSyncExternalStore } from "react";
import { useFormatter, useTranslations } from "next-intl";

const MINUTE_MS = 60 * 1000;

type Period = "morning" | "afternoon" | "evening" | "other";

function subscribe(onChange: () => void) {
  const interval = setInterval(onChange, MINUTE_MS);
  return () => clearInterval(interval);
}

// Rounded to the minute so the snapshot stays stable between renders
function getSnapshot(): number {
  return Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS;
}

// The server does not know the user's clock or timezone
function getServerSnapshot(): null {
  return null;
}

function getPeriod(date: Date | null): Period {
  if (!date) return "other";
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 19) return "afternoon";
  return "evening";
}

interface GreetingProps {
  name: string | null;
}

export function Greeting({ name }: GreetingProps) {
  const t = useTranslations("greeting");
  const format = useFormatter();
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const firstName = name?.split(" ")[0] ?? "";
  const date = now === null ? null : new Date(now);

  // Not a heading: every page names itself with its own h1, the greeting is the same everywhere.
  // The date stays on one line: full on wide screens, short when the sidebar leaves little room.
  return (
    <div className="min-w-0">
      <p className="hidden h-5 truncate text-sm text-muted-foreground first-letter:uppercase sm:block">
        <span className="xl:hidden">{date ? format.dateTime(date, { dateStyle: "medium" }) : ""}</span>
        <span className="hidden xl:inline">{date ? format.dateTime(date, { dateStyle: "full" }) : ""}</span>
      </p>
      <p className="truncate text-xl font-semibold text-foreground @3xl:text-2xl">
        {t("hello", { period: getPeriod(date), name: firstName })}
      </p>
    </div>
  );
}
