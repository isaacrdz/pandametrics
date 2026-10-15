"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { submitSurveyResponse } from "@/actions/kiosk";
import { ExitSurveyButton } from "@/components/kiosk/ExitSurveyButton";
import { FullscreenToggle } from "@/components/kiosk/FullscreenToggle";
import { KioskFrame } from "@/components/kiosk/KioskFrame";
import { KioskMessage } from "@/components/kiosk/KioskMessage";
import { ProgressCard } from "@/components/kiosk/ProgressCard";
import { QuestionView } from "@/components/kiosk/QuestionView";
import { TapToStart } from "@/components/kiosk/TapToStart";
import { ThanksScreen } from "@/components/kiosk/ThanksScreen";
import { useAppLocale } from "@/i18n/LocaleProvider";
import { getDeviceId, takeKioskEntry } from "@/lib/kiosk/client-meta";
import { isFullscreenSupported } from "@/lib/kiosk/fullscreen";
import type { PublicSurvey } from "@/lib/surveys/public";
import { cn } from "@/lib/utils";

type Direction = "next" | "prev";

// idle: the question is shown and takes input. leaving / entering: the transition is running
type Stage = "idle" | "leaving" | "entering";

// What fills the screen: the questions, the thank-you countdown, the tap-to-start cover after a
// restart that lost fullscreen, or a message when the survey closed or disappeared while answering
type Screen = "answering" | "thanks" | "tapToStart" | "notFound" | "closed";

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
  const tErrors = useTranslations("kiosk.errors");
  // The app language ("en" / "es"), not next-intl's formatting locale ("en-US")
  const { locale } = useAppLocale();
  const { questions } = survey;
  const [screen, setScreen] = useState<Screen>("answering");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [stage, setStage] = useState<Stage>("entering");
  const [direction, setDirection] = useState<Direction>("next");
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [sending, startSending] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Guards against Enter + click sending twice before the pending state renders
  const submittingRef = useRef(false);
  const startedAtRef = useRef(0);
  const sourceRef = useRef<"KIOSK" | "LINK">("LINK");
  const fullscreenAtSendRef = useRef(false);
  const busy = stage !== "idle" || sending;

  // Once per runner: where the respondent came from, and when the first question appeared
  useEffect(() => {
    sourceRef.current = takeKioskEntry(survey.code) ? "KIOSK" : "LINK";
    startedAtRef.current = Date.now();
  }, [survey.code]);

  const question = questions[index];
  const selectedId = answers[question.id];
  const isLast = index === questions.length - 1;
  const answeredCount = questions.filter((q) => answers[q.id]).length;
  const canGoBack = index > 0;
  const canGoForward = !isLast && Boolean(selectedId);

  const goTo = useCallback(
    (target: number) => {
      if (busy || target === index || target < 0 || target >= questions.length) return;
      setDirection(target > index ? "next" : "prev");
      setPendingIndex(target);
      setStage("leaving");
    },
    [busy, index, questions.length],
  );

  const select = useCallback(
    (optionId: string) => {
      if (busy) return;
      setAnswers((current) => ({ ...current, [question.id]: optionId }));
    },
    [busy, question.id],
  );

  const submit = useCallback(() => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    fullscreenAtSendRef.current = document.fullscreenElement !== null;

    startSending(async () => {
      try {
        const result = await submitSurveyResponse({
          code: survey.code,
          items: questions.map((q) => ({ questionId: q.id, answerOptionId: answers[q.id] })),
          source: sourceRef.current,
          deviceId: getDeviceId(),
          locale,
          durationMs: Date.now() - startedAtRef.current,
        });
        if (result.ok) setScreen("thanks");
        else if (result.error === "NOT_FOUND") setScreen("notFound");
        else if (result.error === "CLOSED") setScreen("closed");
        // Invalid or rate limited: the answers stay so the person can try again
        else toast.error(tErrors(result.error));
      } catch {
        toast.error(tErrors("network"));
      } finally {
        submittingRef.current = false;
      }
    });
  }, [answers, locale, questions, survey.code, tErrors]);

  const confirm = useCallback(() => {
    if (busy || !selectedId) return;
    if (isLast) submit();
    else goTo(index + 1);
  }, [busy, goTo, index, isLast, selectedId, submit]);

  // A fresh start for the next person; fullscreen lost since the send is restored by a tap
  const restart = useCallback(() => {
    setAnswers({});
    setIndex(0);
    setPendingIndex(null);
    setDirection("next");
    setStage("entering");
    startedAtRef.current = Date.now();
    const lostFullscreen = fullscreenAtSendRef.current && isFullscreenSupported() && !document.fullscreenElement;
    setScreen(lostFullscreen ? "tapToStart" : "answering");
  }, []);

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
    if (stage === "idle" || screen !== "answering") return;
    const timer = window.setTimeout(advanceStage, 500);
    return () => window.clearTimeout(timer);
  }, [advanceStage, screen, stage]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (screen !== "answering" || exitOpen || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
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
  }, [canGoForward, confirm, exitOpen, goTo, index, question.options, screen, select]);

  if (screen === "notFound" || screen === "closed") {
    return (
      <KioskFrame>
        <KioskMessage kind={screen} code={survey.code} />
      </KioskFrame>
    );
  }

  const animationClass =
    stage === "leaving" ? `kiosk-out-${direction}` : stage === "entering" ? `kiosk-in-${direction}` : undefined;
  const answering = screen === "answering";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8 sm:py-6 [@media(max-height:520px)]:py-2">
        <p className="min-w-0 truncate text-sm font-medium text-muted-foreground">{survey.name}</p>
        <div className="flex shrink-0 items-center gap-3">
          <FullscreenToggle />
          {/* After sending nothing is lost, so exiting from the thank-you screen does not ask */}
          <ExitSurveyButton
            hasAnswers={answering && answeredCount > 0}
            confirmOpen={exitOpen}
            onConfirmOpenChange={setExitOpen}
          />
        </div>
      </header>

      {answering ? (
        <>
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
                sending={sending}
                headingRef={headingRef}
                onSelect={select}
                onConfirm={confirm}
              />
            </div>
          </main>

          <ProgressCard
            answered={answeredCount}
            total={questions.length}
            canGoBack={canGoBack && !busy}
            canGoForward={canGoForward && !busy}
            onBack={() => goTo(index - 1)}
            onForward={() => goTo(index + 1)}
          />
        </>
      ) : (
        <main className="flex flex-1 items-center justify-center px-4 pb-24 sm:px-8">
          {screen === "thanks" && <ThanksScreen onRestart={restart} />}
        </main>
      )}

      {screen === "tapToStart" && <TapToStart onStart={() => setScreen("answering")} />}
    </div>
  );
}
