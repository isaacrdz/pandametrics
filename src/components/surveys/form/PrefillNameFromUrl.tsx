"use client";

import { useFormContext } from "react-hook-form";
import { useConsumeSearchParam } from "@/hooks/use-consume-search-param";
import { TEXT_LIMITS } from "@/lib/surveys/constants";
import type { SurveyFormInput } from "@/lib/surveys/schema";

// /surveys/new?name=…: the command palette's "New survey named …" starts the form with that name.
// Dirty on purpose, so leaving asks before dropping it. Renders nothing
export function PrefillNameFromUrl() {
  const { setValue } = useFormContext<SurveyFormInput>();
  useConsumeSearchParam("name", (value) => {
    const name = Array.from(value.trim()).slice(0, TEXT_LIMITS.name).join("");
    if (name) setValue("name", name, { shouldDirty: true });
  });
  return null;
}
