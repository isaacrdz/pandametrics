"use client";

import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProgressCardProps {
  answered: number;
  total: number;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
}

const ARROW_CLASS =
  "size-11 rounded-xl bg-card enabled:border-primary/60 enabled:text-primary disabled:text-muted-foreground [@media(max-height:520px)]:size-9";

// Bottom right on large screens, a full-width bar on phones
export function ProgressCard({ answered, total, canGoBack, canGoForward, onBack, onForward }: ProgressCardProps) {
  const t = useTranslations("kiosk.runner");
  const percent = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-10 flex items-center gap-4 border-t bg-card px-4 py-3",
        "sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[22rem] sm:rounded-2xl sm:border sm:p-4 sm:shadow-sm",
        "[@media(max-height:520px)]:py-2",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p aria-live="polite" className="text-sm text-muted-foreground [@media(max-height:520px)]:sr-only">
          {t.rich("progress", {
            percent,
            strong: (chunks) => <strong className="font-semibold text-foreground">{chunks}</strong>,
          })}
        </p>
        <div
          role="progressbar"
          aria-label={t("progressLabel")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button type="button" variant="outline" size="icon" disabled={!canGoBack} onClick={onBack} aria-label={t("previous")} className={ARROW_CLASS}>
          <ArrowUpIcon aria-hidden />
        </Button>
        <Button type="button" variant="outline" size="icon" disabled={!canGoForward} onClick={onForward} aria-label={t("next")} className={ARROW_CLASS}>
          <ArrowDownIcon aria-hidden />
        </Button>
      </div>
    </div>
  );
}
