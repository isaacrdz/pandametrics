import { useEffect } from "react";
import { get, useFormState, type FieldPath } from "react-hook-form";
import { useTranslations } from "next-intl";
import type { DefaultOptionLabels } from "@/lib/surveys/form-values";
import type { SurveyFormInput } from "@/lib/surveys/schema";

// Browser prompt on reload or tab close while there are unsaved changes.
// App Router has no route-change events, so in-app links are not intercepted.
export function useBeforeUnloadWarning(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [enabled]);
}

// Error message of an array field: resolver errors land on `.root`, server errors (setError) on the field
export function useArrayError(name: FieldPath<SurveyFormInput>): string | undefined {
  const { errors } = useFormState<SurveyFormInput>({ name });
  const error = get(errors, name) as { message?: string; root?: { message?: string } } | undefined;
  return error?.root?.message ?? error?.message;
}

type ValidationParams = Record<string, number>;

// Zod messages are keys under "validation"; limits are passed as ICU params
export function useValidationMessage() {
  const t = useTranslations("validation");
  const translate = t as unknown as (key: string, values?: ValidationParams) => string;

  return (message: string | undefined, params?: ValidationParams): string | undefined => {
    if (!message) return undefined;
    return t.has(message as Parameters<typeof t.has>[0]) ? translate(message, params) : message;
  };
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
