"use client";

import type { RefObject } from "react";
import { Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface DeleteSurveySectionProps {
  onDelete: () => void;
  // The confirmation dialog gives focus back to this button when it closes
  buttonRef: RefObject<HTMLButtonElement | null>;
}

// The last card of the edit form: deleting the survey, kept apart from the numbered sections and
// away from "Save changes". Opens the existing confirmation dialog
export function DeleteSurveySection({ onDelete, buttonRef }: DeleteSurveySectionProps) {
  const t = useTranslations("surveyForm");

  return (
    // A container, so the text and the button sit side by side only when the card has room
    <section aria-labelledby="delete-survey-title" className="@container rounded-3xl border border-destructive/30 bg-card p-5 sm:p-8">
      <div className="flex flex-col gap-4 @xl:flex-row @xl:items-center @xl:justify-between">
        <div className="min-w-0">
          <h2 id="delete-survey-title" className="text-xl font-bold text-foreground sm:text-2xl">
            {t("danger.title")}
          </h2>
          <p className="mt-1 text-muted-foreground">{t("danger.description")}</p>
        </div>
        <Button
          ref={buttonRef}
          type="button"
          variant="outline"
          onClick={onDelete}
          className="h-11 shrink-0 gap-2 rounded-full border-destructive/40 bg-card px-5 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2Icon aria-hidden className="size-5" />
          {t("actions.deleteSurvey")}
        </Button>
      </div>
    </section>
  );
}
