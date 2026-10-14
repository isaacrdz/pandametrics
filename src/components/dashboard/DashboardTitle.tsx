"use client";

import { useTranslations } from "next-intl";

// The page's h1, for screen readers: the dashboard is otherwise named only by its sections
export function DashboardTitle() {
  const t = useTranslations("nav");

  return <h1 className="sr-only">{t("dashboard")}</h1>;
}
