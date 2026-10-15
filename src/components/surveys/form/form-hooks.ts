import { get, useFormState, type FieldPath } from "react-hook-form";
import { useTranslations } from "next-intl";
import type { DefaultOptionLabels } from "@/lib/surveys/form-values";
import type { SurveyFormInput } from "@/lib/surveys/schema";

// Error message of an array field: resolver errors land on `.root`, server errors (setError) on the field
export function useArrayError(name: FieldPath<SurveyFormInput>): string | undefined {
  const { errors } = useFormState<SurveyFormInput>({ name });
  const error = get(errors, name) as { message?: string; root?: { message?: string } } | undefined;
  return error?.root?.message ?? error?.message;
}

// Default labels for new reaction and rating options, in the creator's language
export function useDefaultOptionLabels(): DefaultOptionLabels {
  const tReactions = useTranslations("reactions");
  const tRatings = useTranslations("ratings");

  return {
    reaction: (value) => tReactions(value),
    rating: (value) => tRatings("label", { value: Number(value) }),
  };
}
