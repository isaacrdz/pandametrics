"use client";

import { useTranslations } from "next-intl";
import { SurveyResults } from "@/components/dashboard/SurveyResults";
import { REACTION_COLORS, REACTION_VALUES } from "@/lib/surveys/constants";
import type { QuestionMetrics, ReactionValue, SurveyMetrics } from "@/types/survey";

// Illustrative numbers, not real data: the landing does not depend on the database.
// The code contains the reserved "PANDA" token, so no real survey can ever get it (see newCode)
const PREVIEW_CODE = "PANDA1";
const PREVIEW_QUESTIONS = [
  { key: "visit", counts: { INCREDIBLE: 762, VERY_GOOD: 602, GOOD: 296, BAD: 118, VERY_BAD: 64 } },
  { key: "staff", counts: { INCREDIBLE: 698, VERY_GOOD: 655, GOOD: 312, BAD: 121, VERY_BAD: 56 } },
] as const satisfies readonly { key: string; counts: Record<ReactionValue, number> }[];

// The same shape the dashboard card receives, so the shared results components render it unchanged
function usePreviewMetrics(): SurveyMetrics {
  const t = useTranslations("landing.hero.preview");
  const tReactions = useTranslations("reactions");

  const questions = PREVIEW_QUESTIONS.map(({ key, counts }): QuestionMetrics => {
    const totalAnswers = REACTION_VALUES.reduce((sum, value) => sum + counts[value], 0);
    return {
      questionId: key,
      text: t(`questions.${key}`),
      totalAnswers,
      average: null,
      options: REACTION_VALUES.map((value) => ({
        optionId: `${key}-${value}`,
        type: "REACTION",
        value,
        label: tReactions(value),
        color: REACTION_COLORS[value],
        count: counts[value],
        share: counts[value] / totalAnswers,
        archived: false,
      })),
    };
  });

  return { surveyId: "preview", totalResponses: questions[0].totalAnswers, questions };
}

// The hero's right column: a dashboard survey card with example data, without the actions menu
export function HeroSurveyPreview() {
  const t = useTranslations("landing.hero.preview");
  const tResults = useTranslations("results");
  const metrics = usePreviewMetrics();

  // Just the card, capped while the hero is stacked (below lg)
  return (
    <figure aria-label={t("label")} className="mx-auto w-full max-w-xl lg:max-w-none">
      <article className="flex flex-col gap-5 rounded-3xl border border-card-border bg-card p-5 sm:p-6">
        <header className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="line-clamp-2 text-lg font-bold text-foreground sm:text-xl">{t("name")}</p>
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              <span className="font-mono tracking-wide">{PREVIEW_CODE}</span>
              <span aria-hidden>·</span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="size-2 rounded-full bg-success shadow-[0_0_8px_var(--success)]" />
                {tResults("active")}
              </span>
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
            {t("badge")}
          </span>
        </header>
        <SurveyResults category="SATISFACTION" metrics={metrics} />
      </article>
    </figure>
  );
}
