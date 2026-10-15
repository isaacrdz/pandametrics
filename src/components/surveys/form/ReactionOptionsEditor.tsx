"use client";

import type { CSSProperties } from "react";
import { PlusIcon } from "lucide-react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { OptionLabelInput } from "@/components/surveys/form/OptionLabelInput";
import { OptionsHeader } from "@/components/surveys/form/OptionsHeader";
import { RemoveButton } from "@/components/surveys/form/RemoveButton";
import { useValidationMessage } from "@/components/form/form-hooks";
import { useArrayError, useDefaultOptionLabels } from "@/components/surveys/form/form-hooks";
import { ReactionFace } from "@/components/surveys/ReactionFace";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OPTION_LIMITS, REACTION_COLORS, REACTION_VALUES, TEXT_LIMITS } from "@/lib/surveys/constants";
import { createReactionOption } from "@/lib/surveys/form-values";
import type { SurveyFormInput } from "@/lib/surveys/schema";
import type { ReactionValue } from "@/types/survey";

const { min: MIN_OPTIONS, max: MAX_OPTIONS } = OPTION_LIMITS.SATISFACTION;

function isReaction(value: string): value is ReactionValue {
  return REACTION_VALUES.includes(value as ReactionValue);
}

interface ReactionOptionsEditorProps {
  questionIndex: number;
}

export function ReactionOptionsEditor({ questionIndex }: ReactionOptionsEditorProps) {
  const t = useTranslations("surveyForm.options");
  const tReactions = useTranslations("reactions");
  const validationMessage = useValidationMessage();
  const labels = useDefaultOptionLabels();
  const { control, getValues, setValue } = useFormContext<SurveyFormInput>();
  const name = `questions.${questionIndex}.options` as const;
  const { fields, append, remove } = useFieldArray({ control, name, keyName: "fieldKey" });
  const options = useWatch({ control, name }) ?? [];
  const used = new Set(options.map((option) => option.value));
  const firstUnused = REACTION_VALUES.find((value) => !used.has(value));
  const arrayError = useArrayError(name);
  const idBase = `question-${questionIndex}-options`;

  // Changing the reaction also updates the label and color when they still have the defaults
  function changeReaction(index: number, next: ReactionValue) {
    const current = getValues(`${name}.${index}`);
    const previous = current.value;
    setValue(`${name}.${index}.value`, next, { shouldDirty: true, shouldValidate: true });
    if (isReaction(previous) && current.label === labels.reaction(previous)) {
      setValue(`${name}.${index}.label`, labels.reaction(next), { shouldDirty: true });
    }
    if (isReaction(previous) && current.color.toLowerCase() === REACTION_COLORS[previous]) {
      setValue(`${name}.${index}.color`, REACTION_COLORS[next], { shouldDirty: true });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <OptionsHeader
        id={idBase}
        hint={t("reactionHint", { max: MAX_OPTIONS })}
        count={fields.length}
        max={MAX_OPTIONS}
        error={validationMessage(arrayError, { min: MIN_OPTIONS, max: MAX_OPTIONS })}
      />

      <ul className="flex flex-col gap-3">
        {fields.map((field, index) => {
          const option = options[index];
          const value = option?.value ?? "";
          const rowId = `${idBase}-${index}`;

          return (
            <li key={field.fieldKey} className="flex flex-wrap items-start gap-3 rounded-2xl border p-3 sm:flex-nowrap sm:items-center">
              <Controller
                name={`${name}.${index}.value`}
                control={control}
                render={({ fieldState }) => (
                  <div className="flex flex-col gap-1">
                    <Select value={value} onValueChange={(next) => isReaction(next) && changeReaction(index, next)}>
                      <SelectTrigger
                        aria-label={t("reaction", { number: index + 1 })}
                        aria-invalid={fieldState.invalid}
                        className="h-12! w-40 rounded-xl"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REACTION_VALUES.filter((reaction) => reaction === value || !used.has(reaction)).map((reaction) => (
                          <SelectItem key={reaction} value={reaction}>
                            {tReactions(reaction)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError>{validationMessage(fieldState.error?.message)}</FieldError>
                  </div>
                )}
              />

              <Controller
                name={`${name}.${index}.color`}
                control={control}
                render={({ field: colorField }) => (
                  <label
                    style={{ "--swatch": colorField.value } as CSSProperties}
                    className="h-12 w-3 shrink-0 cursor-pointer rounded-full bg-(--swatch) has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
                  >
                    <input
                      type="color"
                      value={colorField.value}
                      onChange={colorField.onChange}
                      onBlur={colorField.onBlur}
                      aria-label={t("color", { number: index + 1 })}
                      className="sr-only"
                    />
                  </label>
                )}
              />

              {isReaction(value) && (
                <ReactionFace value={value} color={option?.color ?? REACTION_COLORS[value]} className="size-12 shadow-none sm:size-12" />
              )}

              <OptionLabelInput
                name={`${name}.${index}.label`}
                id={`${rowId}-label`}
                number={index + 1}
                maxLength={TEXT_LIMITS.reactionLabel}
                className="order-last basis-full sm:order-none sm:basis-auto sm:flex-1"
              />

              <span className="ml-auto sm:ml-0">
                <RemoveButton
                  label={t("remove", { number: index + 1, question: questionIndex + 1 })}
                  disabled={fields.length <= MIN_OPTIONS}
                  onClick={() => remove(index)}
                />
              </span>
            </li>
          );
        })}
      </ul>

      <Button
        type="button"
        variant="outline"
        disabled={fields.length >= MAX_OPTIONS || !firstUnused}
        onClick={() => firstUnused && append(createReactionOption(firstUnused, labels), { focusName: `${name}.${fields.length}.label` })}
        className="h-11 w-fit gap-2 rounded-xl"
      >
        <PlusIcon aria-hidden />
        {t("add")}
      </Button>
    </div>
  );
}
