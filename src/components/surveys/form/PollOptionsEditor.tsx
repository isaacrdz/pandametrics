"use client";

import type { CSSProperties } from "react";
import { PlusIcon } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { OptionLabelInput } from "@/components/surveys/form/OptionLabelInput";
import { OptionsHeader } from "@/components/surveys/form/OptionsHeader";
import { RemoveButton } from "@/components/surveys/form/RemoveButton";
import { useArrayError, useValidationMessage } from "@/components/surveys/form/form-hooks";
import { Button } from "@/components/ui/button";
import { OPTION_LIMITS, TEXT_LIMITS } from "@/lib/surveys/constants";
import { createPollOption } from "@/lib/surveys/form-values";
import type { SurveyFormInput } from "@/lib/surveys/schema";

const { min: MIN_OPTIONS, max: MAX_OPTIONS } = OPTION_LIMITS.POLL;

interface PollOptionsEditorProps {
  questionIndex: number;
}

export function PollOptionsEditor({ questionIndex }: PollOptionsEditorProps) {
  const t = useTranslations("surveyForm.options");
  const validationMessage = useValidationMessage();
  const { control } = useFormContext<SurveyFormInput>();
  const name = `questions.${questionIndex}.options` as const;
  const { fields, append, remove } = useFieldArray({ control, name, keyName: "fieldKey" });
  const options = useWatch({ control, name }) ?? [];
  const arrayError = useArrayError(name);
  const idBase = `question-${questionIndex}-options`;

  return (
    <div className="flex flex-col gap-4">
      <OptionsHeader
        id={idBase}
        hint={t("pollHint", { min: MIN_OPTIONS, max: MAX_OPTIONS })}
        count={fields.length}
        max={MAX_OPTIONS}
        error={validationMessage(arrayError, { min: MIN_OPTIONS, max: MAX_OPTIONS })}
      />

      <ul className="flex flex-col gap-3">
        {fields.map((field, index) => (
          <li key={field.fieldKey} className="flex items-start gap-3 rounded-2xl border p-3 sm:items-center">
            <span
              aria-hidden
              style={{ "--swatch": options[index]?.color } as CSSProperties}
              className="mt-0 h-12 w-3 shrink-0 rounded-full bg-(--swatch)"
            />
            <OptionLabelInput
              name={`${name}.${index}.label`}
              id={`${idBase}-${index}-label`}
              number={index + 1}
              maxLength={TEXT_LIMITS.pollLabel}
              className="flex-1"
            />
            <RemoveButton
              label={t("remove", { number: index + 1, question: questionIndex + 1 })}
              disabled={fields.length <= MIN_OPTIONS}
              onClick={() => remove(index)}
            />
          </li>
        ))}
      </ul>

      <Button
        type="button"
        variant="outline"
        disabled={fields.length >= MAX_OPTIONS}
        onClick={() => append(createPollOption(fields.length), { focusName: `${name}.${fields.length}.label` })}
        className="h-11 w-fit gap-2 rounded-xl"
      >
        <PlusIcon aria-hidden />
        {t("add")}
      </Button>
    </div>
  );
}
