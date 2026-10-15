"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ExitSurveyButton } from "@/components/kiosk/ExitSurveyButton";
import { FullscreenToggle } from "@/components/kiosk/FullscreenToggle";
import { ProgressCard } from "@/components/kiosk/ProgressCard";
import { QuestionView } from "@/components/kiosk/QuestionView";
import type { PublicSurvey } from "@/lib/surveys/public";
import { cn } from "@/lib/utils";

type Direction = "next" | "prev";

// idle: the question is shown and takes input. leaving / entering: the transition is running
type Stage = "idle" | "leaving" | "entering";

// Keys 1–5 pick the option in that position
const NUMBER_KEYS = ["1", "2", "3", "4", "5"];

// Typing in a field must not answer the survey
function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

// Enter on a focused button or link already clicks it (OK, the arrows, exit), so the shortcut
// must not run a second action. Options are the exception: Enter there confirms the answer
function isClickable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.closest("button, a") !== null && target.getAttribute("role") !== "radio";
}

export function SurveyRunner({ survey }: { survey: PublicSurvey }) {
  const t = useTranslations("kiosk.runner");
  const { questions } = survey;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [stage, setStage] = useState<Stage>("entering");
  const [direction, setDirection] = useState<Direction>("next");
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const question = questions[index];
  const selectedId = answers[question.id];
  const isLast = index === questions.length - 1;
  const answeredCount = questions.filter((q) => answers[q.id]).length;
  const canGoBack = index > 0;
  const canGoForward = !isLast && Boolean(selectedId);

  const goTo = useCallback(
    (target: number) => {
      if (stage !== "idle" || target === index || target < 0 || target >= questions.length) return;
      setDirection(target > index ? "next" : "prev");
      setPendingIndex(target);
      setStage("leaving");
    },
    [index, questions.length, stage],
  );

  const select = useCallback(
    (optionId: string) => {
      if (stage !== "idle") return;
      setAnswers((current) => ({ ...current, [question.id]: optionId }));
    },
    [question.id, stage],
  );

  const confirm = useCallback(() => {
    if (stage !== "idle" || !selectedId) return;
    if (!isLast) {
      goTo(index + 1);
      return;
    }
    // Sending is kiosk phase 3; until then the answers stay on screen
    toast.info(t("sendSoon"));
  }, [goTo, index, isLast, selectedId, stage, t]);

  const advanceStage = useCallback(() => {
    if (stage === "leaving" && pendingIndex !== null) {
      setIndex(pendingIndex);
      setPendingIndex(null);
      setStage("entering");
    } else if (stage === "entering") {
      setStage("idle");
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [pendingIndex, stage]);

  // The animation end moves the transition on; the timer is a fallback for when no animation
  // event arrives (tab in the background, animations disabled), so the runner never gets stuck
  useEffect(() => {
    if (stage === "idle") return;
    const timer = window.setTimeout(advanceStage, 500);
    return () => window.clearTimeout(timer);
  }, [advanceStage, stage]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (exitOpen || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTextField(event.target)) return;

      const position = NUMBER_KEYS.indexOf(event.key);
      if (position !== -1 && position < question.options.length) {
        event.preventDefault();
        select(question.options[position].id);
      } else if (event.key === "Enter" && !isClickable(event.target)) {
        event.preventDefault();
        confirm();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        goTo(index - 1);
      } else if (event.key === "ArrowDown" && canGoForward) {
        event.preventDefault();
        goTo(index + 1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canGoForward, confirm, exitOpen, goTo, index, question.options, select]);

  const animationClass =
    stage === "leaving" ? `kiosk-out-${direction}` : stage === "entering" ? `kiosk-in-${direction}` : undefined;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8 sm:py-6 [@media(max-height:520px)]:py-2">
        <p className="min-w-0 truncate text-sm font-medium text-muted-foreground">{survey.name}</p>
        <div className="flex shrink-0 items-center gap-3">
          <FullscreenToggle />
          <ExitSurveyButton hasAnswers={answeredCount > 0} confirmOpen={exitOpen} onConfirmOpenChange={setExitOpen} />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pt-4 pb-28 sm:px-8 sm:pb-32 [@media(max-height:520px)]:items-start [@media(max-height:520px)]:pb-20">
        <div
          key={question.id}
          className={cn("flex w-full justify-center", animationClass)}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) advanceStage();
          }}
        >
          <QuestionView
            question={question}
            category={survey.category}
            selectedId={selectedId}
            isLast={isLast}
            headingRef={headingRef}
            onSelect={select}
            onConfirm={confirm}
          />
        </div>
      </main>

      <ProgressCard
        answered={answeredCount}
        total={questions.length}
        canGoBack={canGoBack && stage === "idle"}
        canGoForward={canGoForward && stage === "idle"}
        onBack={() => goTo(index - 1)}
        onForward={() => goTo(index + 1)}
      />
    </div>
  );
}
