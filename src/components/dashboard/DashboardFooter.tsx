"use client";

import { useTranslations } from "next-intl";

export function DashboardFooter() {
  const t = useTranslations("dashboard");

  return <footer className="pb-2 text-center text-sm text-muted-foreground">{t("footer")}</footer>;
}
