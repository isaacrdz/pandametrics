"use client";

import { useState } from "react";
import { InfoIcon } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { FormSection } from "@/components/surveys/form/FormSection";
import { RequiredMark } from "@/components/surveys/form/RequiredMark";
import { useDefaultOptionLabels, useValidationMessage } from "@/components/surveys/form/form-hooks";
import { ReactionFace } from "@/components/surveys/ReactionFace";
import { StarRow } from "@/components/surveys/StarRow";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FieldError } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { REACTION_COLORS, REACTION_VALUES, SURVEY_CATEGORIES } from "@/lib/surveys/constants";
import { applyCategory, hasQuestionContent } from "@/lib/surveys/form-values";
import type { SurveyFormInput } from "@/lib/surveys/schema";
import { cn } from "@/lib/utils";
import type { SurveyCategory } from "@/types/survey";

function CategoryPreview({ category }: { category: SurveyCategory }) {
  if (category === "SATISFACTION") {
    return (
      <span className="flex gap-1">
        {REACTION_VALUES.map((value) => (
          <ReactionFace
            key={value}
            value={value}
            color={REACTION_COLORS[value]}
            className="size-6 border shadow-none sm:size-6"
          />
        ))}
      </span>
    );
  }
  if (category === "RATING") return <StarRow filled={4} showEmpty />;
  return (
    <span className="flex w-28 flex-col gap-1.5">
      <span className="h-2.5 w-full rounded-full bg-primary/70" />
      <span className="h-2.5 w-3/5 rounded-full bg-primary/35" />
    </span>
  );
}

interface CategoryPickerProps {
  locked: boolean;
}

export function CategoryPicker({ locked }: CategoryPickerProps) {
  const t = useTranslations("surveyForm");
  const tCategories = useTranslations("categories");
  const validationMessage = useValidationMessage();
  const labels = useDefaultOptionLabels();
  const { control, getValues, setValue, formState } = useFormContext<SurveyFormInput>();
  const category = useWatch({ control, name: "category" });
  const [pending, setPending] = useState<SurveyCategory | null>(null);
  const error = formState.errors.category?.message;

  function apply(next: SurveyCategory) {
    setValue("category", next, { shouldDirty: true, shouldValidate: formState.isSubmitted });
    setValue("questions", applyCategory(getValues("questions"), next, labels), { shouldDirty: true });
  }

  function handleChange(value: string) {
    const next = value as SurveyCategory;
    if (next === category) return;
    // Options are rebuilt for the new category: ask first if the user already wrote something
    if (category && hasQuestionContent(getValues("questions"))) setPending(next);
    else apply(next);
  }

  const visible = locked && category ? [category] : SURVEY_CATEGORIES;

  return (
    <FormSection
      id="survey-category"
      number={2}
      title={t("sections.category.title")}
      description={t("sections.category.description")}
    >
      <div className="flex flex-col gap-4">
        <span id="category-label" className="sr-only">
          {t("sections.category.title")} <RequiredMark />
        </span>
        <RadioGroup
          value={category}
          onValueChange={handleChange}
          disabled={locked}
          aria-labelledby="category-label"
          aria-describedby={error ? "category-error" : undefined}
          className={cn("grid gap-3", !locked && "sm:grid-cols-3")}
        >
          {visible.map((option) => (
            <label
              key={option}
              htmlFor={`category-${option}`}
              className={cn(
                "flex cursor-pointer flex-col gap-3 rounded-2xl border bg-card p-4 transition-colors",
                "hover:bg-accent/40 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                "has-data-checked:border-primary has-data-checked:bg-accent/50",
                locked && "cursor-default hover:bg-card",
                error && "border-destructive/60",
              )}
            >
              <span className="flex items-start justify-between gap-3">
                <span aria-hidden className="flex h-7 items-center">
                  <CategoryPreview category={option} />
                </span>
                <RadioGroupItem id={`category-${option}`} value={option} aria-invalid={Boolean(error)} />
              </span>
              <span className="font-semibold text-foreground">{tCategories(`${option}.title`)}</span>
              <span className="text-sm text-muted-foreground">{tCategories(`${option}.description`)}</span>
            </label>
          ))}
        </RadioGroup>

        <FieldError id="category-error">{validationMessage(error)}</FieldError>

        {locked && (
          <Alert className="border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100">
            <InfoIcon aria-hidden />
            <AlertDescription className="text-current">{t("category.locked")}</AlertDescription>
          </Alert>
        )}
      </div>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("category.changeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("category.changeDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("category.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) apply(pending);
                setPending(null);
              }}
            >
              {t("category.changeConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormSection>
  );
}
