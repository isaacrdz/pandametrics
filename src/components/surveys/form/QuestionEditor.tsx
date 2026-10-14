"use client";

import { Controller, useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { PollOptionsEditor } from "@/components/surveys/form/PollOptionsEditor";
import { RatingOptionsPreview } from "@/components/surveys/form/RatingOptionsPreview";
import { ReactionOptionsEditor } from "@/components/surveys/form/ReactionOptionsEditor";
import { RemoveButton } from "@/components/surveys/form/RemoveButton";
import { RequiredMark } from "@/components/surveys/form/RequiredMark";
import { useValidationMessage } from "@/components/surveys/form/form-hooks";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TEXT_LIMITS } from "@/lib/surveys/constants";
import type { SurveyFormInput } from "@/lib/surveys/schema";
import type { SurveyCategory } from "@/types/survey";

const OPTION_EDITORS: Record<SurveyCategory, (props: { questionIndex: number }) => React.JSX.Element> = {
  SATISFACTION: ReactionOptionsEditor,
  RATING: RatingOptionsPreview,
  POLL: PollOptionsEditor,
};

interface QuestionEditorProps {
  index: number;
  category: SurveyCategory;
  canRemove: boolean;
  onRemove: () => void;
}

export function QuestionEditor({ index, category, canRemove, onRemove }: QuestionEditorProps) {
  const t = useTranslations("surveyForm.questions");
  const validationMessage = useValidationMessage();
  const { control } = useFormContext<SurveyFormInput>();
  const OptionsEditor = OPTION_EDITORS[category];
  const inputId = `question-${index}-text`;

  return (
    <div className="flex flex-col gap-6">
      <Controller
        name={`questions.${index}.text`}
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <div className="flex items-center justify-between gap-3">
              <FieldLabel htmlFor={inputId} className="font-semibold text-muted-foreground">
                {t("label", { number: String(index + 1).padStart(2, "0") })} <RequiredMark />
              </FieldLabel>
              <RemoveButton label={t("remove", { number: index + 1 })} disabled={!canRemove} onClick={onRemove} />
            </div>
            <Input
              {...field}
              id={inputId}
              aria-invalid={fieldState.invalid}
              aria-describedby={fieldState.invalid ? `${inputId}-error` : undefined}
              autoComplete="off"
              className="h-12 rounded-xl bg-muted/60 px-4 text-[0.95rem]"
            />
            <FieldError id={`${inputId}-error`}>
              {validationMessage(fieldState.error?.message, { max: TEXT_LIMITS.question })}
            </FieldError>
          </Field>
        )}
      />
      <OptionsEditor questionIndex={index} />
    </div>
  );
}
