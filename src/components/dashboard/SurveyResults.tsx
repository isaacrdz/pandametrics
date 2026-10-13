"use client";

import { useState, type KeyboardEvent } from "react";
import { ChevronLeftIcon, ChevronRightIcon, StarIcon } from "lucide-react";
import { CopyButton } from "@/components/dashboard/CopyButton";
import { PollChart } from "@/components/dashboard/PollChart";
import { RatingChart } from "@/components/dashboard/RatingChart";
import { SatisfactionChart } from "@/components/dashboard/SatisfactionChart";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatNumber, formatResponses } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { QuestionMetrics, SurveyCategory, SurveyMetrics } from "@/types/survey";

const COPY = {
  code: "código:",
  copyCode: "Copiar código",
  codeCopied: "Código copiado",
  active: "Activa",
  inactive: "Inactiva",
  title: "Resumen de respuestas",
  previous: "Pregunta anterior",
  next: "Pregunta siguiente",
  total: "Respuestas totales",
  noQuestions: "Esta encuesta no tiene preguntas.",
};

function CategoryChart({ category, question }: { category: SurveyCategory; question: QuestionMetrics }) {
  if (category === "SATISFACTION") return <SatisfactionChart question={question} />;
  if (category === "RATING") return <RatingChart question={question} />;
  return <PollChart question={question} />;
}

interface QuestionPagerProps {
  count: number;
  index: number;
  onChange: (index: number) => void;
}

function QuestionPager({ count, index, onChange }: QuestionPagerProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      <Button variant="ghost" size="icon-sm" aria-label={COPY.previous} disabled={index === 0} onClick={() => onChange(index - 1)}>
        <ChevronLeftIcon aria-hidden />
      </Button>
      <div className="flex items-center gap-2">
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Pregunta ${i + 1} de ${count}`}
            aria-current={i === index ? "true" : undefined}
            onClick={() => onChange(i)}
            className={cn(
              "h-2.5 rounded-full outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
              i === index ? "w-9 bg-primary" : "w-2.5 bg-muted-foreground/35 hover:bg-muted-foreground/60",
            )}
          />
        ))}
      </div>
      <Button variant="ghost" size="icon-sm" aria-label={COPY.next} disabled={index === count - 1} onClick={() => onChange(index + 1)}>
        <ChevronRightIcon aria-hidden />
      </Button>
    </div>
  );
}

interface SurveyResultsProps {
  category: SurveyCategory;
  code: string;
  isActive: boolean;
  metrics: SurveyMetrics;
}

export function SurveyResults({ category, code, isActive, metrics }: SurveyResultsProps) {
  const [index, setIndex] = useState(0);
  const count = metrics.questions.length;
  const question = metrics.questions[Math.min(index, count - 1)];

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowLeft" && index > 0) setIndex(index - 1);
    if (event.key === "ArrowRight" && index < count - 1) setIndex(index + 1);
  }

  return (
    <section
      aria-roledescription="carrusel"
      aria-label={COPY.title}
      onKeyDown={handleKeyDown}
      className="flex flex-col gap-6 rounded-2xl border border-card-border bg-card p-5 sm:p-8"
    >
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="flex items-center gap-1 font-mono tracking-wide text-muted-foreground">
          {COPY.code} {code}
          <CopyButton
            value={code}
            label={COPY.copyCode}
            successMessage={COPY.codeCopied}
            className="size-7 text-muted-foreground hover:text-primary"
          />
        </span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <span
            aria-hidden
            className={cn(
              "size-2.5 rounded-full",
              isActive ? "bg-success shadow-[0_0_8px_var(--success)]" : "bg-muted-foreground/50",
            )}
          />
          {isActive ? COPY.active : COPY.inactive}
        </span>
      </div>

      <h3 className="text-center text-xl font-bold text-foreground sm:text-2xl">{COPY.title}</h3>

      {count > 1 && <QuestionPager count={count} index={index} onChange={setIndex} />}

      {question ? (
        <div className="flex flex-col gap-5">
          <div aria-live="polite" className="flex items-baseline justify-between gap-4">
            <h4 className="font-semibold text-foreground sm:text-lg">
              {index + 1}. {question.text}
            </h4>
            <span className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
              {question.average !== null && (
                <>
                  <StarIcon aria-hidden className="size-3.5 fill-current text-star" />
                  <span className="font-semibold text-foreground">{question.average.toFixed(1)}</span>
                  <span aria-hidden>·</span>
                </>
              )}
              {formatResponses(question.totalAnswers)}
            </span>
          </div>
          <CategoryChart category={category} question={question} />
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">{COPY.noQuestions}</p>
      )}

      <Separator />

      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{COPY.total}</span>
        <span className="text-2xl font-bold text-foreground tabular-nums">
          {formatNumber(metrics.totalResponses)}
        </span>
      </div>
    </section>
  );
}
