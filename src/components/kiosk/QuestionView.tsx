"use client";

import { ArrowRightIcon, CornerDownLeftIcon, Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Ref } from "react";
import { FaceOptions, PollOptions, StarOptions } from "@/components/kiosk/AnswerOptions";
import { Button } from "@/components/ui/button";
import type { PublicQuestion } from "@/lib/surveys/public";
import type { SurveyCategory } from "@/types/survey";

const OPTIONS_BY_CATEGORY = {
  SATISFACTION: FaceOptions,
  RATING: StarOptions,
  POLL: PollOptions,
} satisfies Record<SurveyCategory, unknown>;

interface QuestionViewProps {
  question: PublicQuestion;
  category: SurveyCategory;
  selectedId: string | undefined;
  isLast: boolean;
  // The last answer is being sent: the button shows a spinner and takes no more clicks
  sending: boolean;
  headingRef: Ref<HTMLHeadingElement>;
  onSelect: (optionId: string) => void;
  onConfirm: () => void;
}

export function QuestionView({
  question,
  category,
  selectedId,
  isLast,
  sending,
  headingRef,
  onSelect,
  onConfirm,
}: QuestionViewProps) {
  const t = useTranslations("kiosk.runner");
  const headingId = `question-${question.id}`;
  const Options = OPTIONS_BY_CATEGORY[category];

  return (
    <div className="flex w-full flex-col items-center gap-8 sm:gap-10 [@media(max-height:520px)]:gap-4">
      <div className="flex flex-col items-center gap-2">
        <h1
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
          className="max-w-3xl text-center text-[clamp(1.875rem,4vw,3.75rem)] leading-tight font-bold tracking-tight text-balance outline-none [@media(max-height:520px)]:text-2xl"
        >
          {question.text}
        </h1>
        <p className="sr-only">{t("keyboardHint")}</p>
      </div>

      <Options options={question.options} selectedId={selectedId} onSelect={onSelect} labelledBy={headingId} />

      <div className="flex w-full max-w-3xl items-center justify-end gap-4">
        <span
          aria-hidden
          className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex [@media(hover:none)]:hidden [@media(max-height:520px)]:hidden"
        >
          {t("pressEnter")}
          <CornerDownLeftIcon className="size-3.5" />
        </span>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={!selectedId || sending}
          aria-busy={sending || undefined}
          className="h-12 w-full gap-2 rounded-xl px-8 text-base font-semibold shadow-[0_10px_24px_-12px_var(--primary)] sm:w-auto [@media(max-height:520px)]:h-10"
        >
          {isLast ? t("send") : t("ok")}
          {sending ? <Loader2Icon aria-hidden className="animate-spin" /> : <ArrowRightIcon aria-hidden />}
        </Button>
      </div>
    </div>
  );
}
