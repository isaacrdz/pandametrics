"use client";

import { useTranslations } from "next-intl";

// Visible asterisk plus text for screen readers
export function RequiredMark() {
  const t = useTranslations("surveyForm.fields");

  return (
    <>
      <span aria-hidden className="text-destructive">
        {"*"}
      </span>
      <span className="sr-only">{t("required")}</span>
    </>
  );
}
