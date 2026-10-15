"use client";

import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { PublicSurvey } from "@/lib/surveys/public";

// Temporary until the question runner (kiosk phase 2): shows which survey was opened
export function SurveyRunnerPlaceholder({ survey }: { survey: PublicSurvey }) {
  const t = useTranslations("kiosk.placeholder");

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex justify-end px-4 py-4 sm:px-8 sm:py-6">
        <Button asChild variant="outline" className="h-11 gap-2 rounded-xl bg-card font-semibold text-primary hover:text-primary">
          <Link href="/s">
            <XIcon aria-hidden />
            {t("exit")}
          </Link>
        </Button>
      </div>
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 pb-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-balance">{survey.name}</h1>
        <p className="text-muted-foreground">{t("questions", { count: survey.questions.length })}</p>
        <p className="text-sm text-muted-foreground">{t("soon")}</p>
      </main>
    </div>
  );
}
