"use client";

import { Controller, useFormContext, type FieldPath } from "react-hook-form";
import { useTranslations } from "next-intl";
import { useValidationMessage } from "@/components/form/form-hooks";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { SurveyFormInput } from "@/lib/surveys/schema";
import { cn } from "@/lib/utils";

interface OptionLabelInputProps {
  name: FieldPath<SurveyFormInput>;
  id: string;
  number: number;
  maxLength: number;
  className?: string;
}

// "OPTION N" floating label on the border, as in the screenshots
export function OptionLabelInput({ name, id, number, maxLength, className }: OptionLabelInputProps) {
  const t = useTranslations("surveyForm.options");
  const validationMessage = useValidationMessage();
  const { control } = useFormContext<SurveyFormInput>();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <div className={cn("relative flex flex-col gap-1", className)}>
          <label
            htmlFor={id}
            className="absolute -top-2 left-3 z-10 bg-card px-1 text-[0.65rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase"
          >
            {t("label", { number })}
          </label>
          <Input
            ref={field.ref}
            name={field.name}
            value={typeof field.value === "string" ? field.value : ""}
            onChange={field.onChange}
            onBlur={field.onBlur}
            id={id}
            aria-invalid={fieldState.invalid}
            aria-describedby={fieldState.invalid ? `${id}-error` : undefined}
            autoComplete="off"
            className="h-12 rounded-xl bg-muted/40 px-4 text-[0.95rem]"
          />
          <FieldError id={`${id}-error`}>
            {validationMessage(fieldState.error?.message, { max: maxLength })}
          </FieldError>
        </div>
      )}
    />
  );
}
