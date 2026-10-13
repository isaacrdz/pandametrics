"use client";

import { useSyncExternalStore } from "react";
import { formatLongDate } from "@/lib/format";

const MINUTE_MS = 60 * 1000;

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

function getGreeting(hour: number): string {
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

interface GreetingProps {
  name: string | null;
}

export function Greeting({ name }: GreetingProps) {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const firstName = name?.split(" ")[0] ?? "";
  const date = now === null ? null : new Date(now);

  return (
    <div className="min-w-0">
      <p className="hidden h-5 text-sm text-muted-foreground first-letter:uppercase sm:block">
        {date ? formatLongDate(date) : ""}
      </p>
      <h1 className="truncate text-xl font-semibold text-foreground sm:text-2xl">
        {date ? getGreeting(date.getHours()) : "Hola"}, {firstName}
      </h1>
    </div>
  );
}
