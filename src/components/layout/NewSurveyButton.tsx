"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function NewSurveyButton() {
  const t = useTranslations("topBar");

  return (
    <Button
      asChild
      className="h-11 gap-2 rounded-full bg-highlight px-3 text-[0.95rem] text-highlight-foreground shadow-[0_10px_24px_-12px_var(--highlight)] hover:bg-highlight/90 @3xl:px-5"
    >
      <Link href="/surveys/new" aria-label={t("newSurvey")}>
        <PlusIcon aria-hidden className="size-5" />
        <span className="hidden @3xl:inline">{t("newSurvey")}</span>
      </Link>
    </Button>
  );
}
