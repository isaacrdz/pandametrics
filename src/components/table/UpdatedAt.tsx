"use client";

import { useFormatter, useTranslations } from "next-intl";
import { TIME_ZONE } from "@/i18n/config";
import { getDayOffset } from "@/lib/format";

// "Today, 10:24 am", "Yesterday, 4:18 pm" or a full date, in the app's time zone
export function UpdatedAt({ updatedAt, now }: { updatedAt: string; now: string }) {
  const t = useTranslations("table.updated");
  const format = useFormatter();
  const date = new Date(updatedAt);
  const offset = getDayOffset(date, new Date(now), TIME_ZONE);
  const time = format.dateTime(date, { hour: "numeric", minute: "2-digit" });

  let text: string;
  if (offset === 0) text = t("today", { time });
  else if (offset === 1) text = t("yesterday", { time });
  else text = format.dateTime(date, { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

  return <time dateTime={updatedAt}>{text}</time>;
}
