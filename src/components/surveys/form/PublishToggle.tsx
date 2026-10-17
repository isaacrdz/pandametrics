"use client";

import { GlobeIcon } from "lucide-react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { SurveyFormInput } from "@/lib/surveys/schema";
import { cn } from "@/lib/utils";
import { useActiveLimitParams } from "@/components/layout/AppShellProvider";

export function PublishToggle() {
  const t = useTranslations("surveyForm");
  const activeLimit = useActiveLimitParams();
  const { control } = useFormContext<SurveyFormInput>();

  return (
    <Controller
      name="isActive"
      control={control}
      render={({ field, fieldState }) => (
        <div
          className={cn(
            "flex items-center gap-4 rounded-2xl border p-4 transition-colors sm:p-5",
            field.value ? "border-success/40 bg-success/10" : "bg-muted/40",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-xl",
              field.value ? "bg-success/20 text-success-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            <GlobeIcon className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span id="publish-title" className="font-semibold text-foreground">
                {t("publish.title")}
              </span>
              <Badge
                variant={field.value ? "default" : "secondary"}
                className={cn(field.value && "bg-success-foreground text-white dark:text-background")}
              >
                {field.value ? t("publish.active") : t("publish.inactive")}
              </Badge>
            </div>
            <p id="publish-hint" className="mt-1 text-sm text-muted-foreground">
              {field.value ? t("publish.activeHint") : t("publish.inactiveHint")}
            </p>
            {fieldState.error?.message === "ACTIVE_LIMIT" && (
              <p role="alert" className="mt-2 text-sm font-medium text-destructive">
                {t("errors.ACTIVE_LIMIT", activeLimit)}
              </p>
            )}
          </div>
          <Switch
            checked={field.value}
            onCheckedChange={field.onChange}
            onBlur={field.onBlur}
            aria-labelledby="publish-title"
            aria-describedby="publish-hint"
            aria-invalid={fieldState.invalid}
            className="scale-125"
          />
        </div>
      )}
    />
  );
}
