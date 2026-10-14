"use client";

import { Controller, useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { FormSection } from "@/components/surveys/form/FormSection";
import { PublishToggle } from "@/components/surveys/form/PublishToggle";
import { RequiredMark } from "@/components/surveys/form/RequiredMark";
import { useValidationMessage } from "@/components/surveys/form/form-hooks";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TEXT_LIMITS } from "@/lib/surveys/constants";
import type { SurveyFormInput } from "@/lib/surveys/schema";

const INPUT_CLASS = "h-12 rounded-xl bg-muted/60 px-4 text-[0.95rem]";

export function SurveyDetailsSection() {
  const t = useTranslations("surveyForm");
  const validationMessage = useValidationMessage();
  const { control } = useFormContext<SurveyFormInput>();

  return (
    <FormSection
      id="survey-details"
      number={1}
      title={t("sections.details.title")}
      description={t("sections.details.description")}
    >
      <FieldGroup className="gap-6">
        <Controller
          name="name"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="survey-name" className="font-semibold text-muted-foreground">
                {t("fields.name")} <RequiredMark />
              </FieldLabel>
              <Input
                {...field}
                id="survey-name"
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.invalid ? "survey-name-error" : undefined}
                autoComplete="off"
                className={INPUT_CLASS}
              />
              <FieldError id="survey-name-error">
                {validationMessage(fieldState.error?.message, { max: TEXT_LIMITS.name })}
              </FieldError>
            </Field>
          )}
        />

        <Controller
          name="description"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="survey-description" className="font-semibold text-muted-foreground">
                {t("fields.description")}
              </FieldLabel>
              <Textarea
                {...field}
                id="survey-description"
                rows={3}
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.invalid ? "survey-description-error" : undefined}
                className="min-h-24 rounded-xl bg-muted/60 px-4 py-3 text-[0.95rem]"
              />
              <FieldError id="survey-description-error">
                {validationMessage(fieldState.error?.message, { max: TEXT_LIMITS.description })}
              </FieldError>
            </Field>
          )}
        />

        <PublishToggle />
      </FieldGroup>
    </FormSection>
  );
}
