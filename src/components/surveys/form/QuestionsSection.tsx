"use client";

import { PlusIcon } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { FormSection } from "@/components/surveys/form/FormSection";
import { QuestionEditor } from "@/components/surveys/form/QuestionEditor";
import { useArrayError, useDefaultOptionLabels, useValidationMessage } from "@/components/surveys/form/form-hooks";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { createQuestion } from "@/lib/surveys/form-values";
import type { SurveyFormInput } from "@/lib/surveys/schema";

export function QuestionsSection() {
  const t = useTranslations("surveyForm");
  const validationMessage = useValidationMessage();
  const labels = useDefaultOptionLabels();
  const { control } = useFormContext<SurveyFormInput>();
  const category = useWatch({ control, name: "category" });
  // keyName keeps the stored `id` of each question untouched
  const { fields, append, remove } = useFieldArray({ control, name: "questions", keyName: "fieldKey" });
  const arrayError = useArrayError("questions");

  return (
    <FormSection
      id="survey-questions"
      number={3}
      title={t("sections.questions.title")}
      description={t("sections.questions.description")}
    >
      {!category ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">
          {t("category.pickHint")}
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {fields.map((field, index) => (
            <div key={field.fieldKey} className="flex flex-col gap-8">
              {index > 0 && <Separator />}
              <QuestionEditor
                index={index}
                category={category}
                canRemove={fields.length > 1}
                onRemove={() => remove(index)}
              />
            </div>
          ))}

          <FieldError>{validationMessage(arrayError)}</FieldError>

          <Button
            type="button"
            variant="outline"
            onClick={() => append(createQuestion(category, labels), { focusName: `questions.${fields.length}.text` })}
            className="h-12 w-fit gap-2 rounded-xl border-dashed border-primary/50 px-5 font-semibold text-primary hover:bg-accent hover:text-primary"
          >
            <PlusIcon aria-hidden />
            {t("questions.add")}
          </Button>
        </div>
      )}
    </FormSection>
  );
}
