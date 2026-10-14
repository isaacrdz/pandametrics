"use client";

import { InfoIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { FieldError } from "@/components/ui/field";

interface OptionsHeaderProps {
  id: string;
  hint: string;
  count?: number;
  max?: number;
  error?: string;
}

export function OptionsHeader({ id, hint, count, max, error }: OptionsHeaderProps) {
  const t = useTranslations("surveyForm.options");
  const atLimit = count !== undefined && max !== undefined && count >= max;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 id={`${id}-title`} className="font-semibold text-foreground">
            {t("title")}
          </h4>
          <p id={`${id}-hint`} className="mt-0.5 text-sm text-muted-foreground">
            {hint}
          </p>
        </div>
        {count !== undefined && max !== undefined && (
          <Badge className="shrink-0 rounded-full px-3 tabular-nums">{t("counter", { count, max })}</Badge>
        )}
      </div>
      {atLimit && (
        <Alert className="border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100">
          <InfoIcon aria-hidden />
          <AlertDescription className="text-current">{t("limit", { max })}</AlertDescription>
        </Alert>
      )}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}
