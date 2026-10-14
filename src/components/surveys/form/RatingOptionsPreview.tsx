"use client";

import { useTranslations } from "next-intl";
import { OptionsHeader } from "@/components/surveys/form/OptionsHeader";
import { StarRow } from "@/components/surveys/StarRow";
import { RATING_VALUES } from "@/lib/surveys/constants";

interface RatingOptionsPreviewProps {
  questionIndex: number;
}

// Rating options are generated (1 to 5 stars): nothing to edit, only a preview
export function RatingOptionsPreview({ questionIndex }: RatingOptionsPreviewProps) {
  const t = useTranslations("surveyForm.options");

  return (
    <div className="flex flex-col gap-4">
      <OptionsHeader id={`question-${questionIndex}-options`} hint={t("ratingHint")} />
      <ul className="flex flex-wrap gap-3">
        {RATING_VALUES.map((value) => (
          <li key={value} className="rounded-xl border bg-muted/40 px-4 py-3">
            <StarRow filled={Number(value)} total={5} showEmpty />
          </li>
        ))}
      </ul>
    </div>
  );
}
