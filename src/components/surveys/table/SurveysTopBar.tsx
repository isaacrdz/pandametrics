"use client";

import { useTranslations } from "next-intl";
import { AppTopBar } from "@/components/layout/AppTopBar";
import { NewSurveyButton } from "@/components/layout/NewSurveyButton";
import { PageHeading } from "@/components/layout/PageHeading";

export function SurveysTopBar({ count }: { count: number }) {
  const t = useTranslations("surveys");

  return (
    <AppTopBar
      heading={<PageHeading title={t("title")} count={count} subtitle={t("subtitle")} />}
      actions={<NewSurveyButton />}
    />
  );
}
