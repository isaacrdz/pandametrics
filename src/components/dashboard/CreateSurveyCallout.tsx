"use client";

import Link from "next/link";
import { ChevronRightIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function CreateSurveyCallout() {
  const t = useTranslations("dashboard.callout");

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-dashed border-card-border bg-card/60 p-5 sm:flex-row sm:items-center sm:p-6">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <PlusIcon aria-hidden className="size-5" />
      </span>
      <div className="flex-1">
        <h2 className="font-semibold text-foreground">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <Button asChild variant="outline" className="h-11 gap-1 rounded-xl bg-card px-5 font-semibold text-accent-foreground">
        <Link href="/surveys/new">
          {t("action")}
          <ChevronRightIcon aria-hidden />
        </Link>
      </Button>
    </section>
  );
}
