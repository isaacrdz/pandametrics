"use client";

import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";

export function KioskLoading() {
  const t = useTranslations("kiosk");

  return (
    <div role="status" className="flex min-h-dvh items-center justify-center">
      <Loader2Icon aria-hidden className="size-8 animate-spin text-primary" />
      <span className="sr-only">{t("loading")}</span>
    </div>
  );
}
