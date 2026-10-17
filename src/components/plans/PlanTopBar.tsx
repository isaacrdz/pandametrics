"use client";

import { useTranslations } from "next-intl";
import { AppTopBar } from "@/components/layout/AppTopBar";
import { PageHeading } from "@/components/layout/PageHeading";

export function PlanTopBar() {
  const t = useTranslations("plan");
  return <AppTopBar heading={<PageHeading title={t("title")} subtitle={t("subtitle")} />} />;
}
