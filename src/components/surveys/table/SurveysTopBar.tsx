"use client";

import { useTranslations } from "next-intl";
import { AppTopBar } from "@/components/layout/AppTopBar";
import { NewSurveyButton } from "@/components/layout/NewSurveyButton";
import { PageHeading } from "@/components/layout/PageHeading";

// Title and subtitle only (no count), so the bar is part of the static shell
export function SurveysTopBar() {
  const t = useTranslations("surveys");

  return (
    <AppTopBar
      heading={<PageHeading title={t("title")} subtitle={t("subtitle")} />}
      actions={<NewSurveyButton />}
    />
  );
}
