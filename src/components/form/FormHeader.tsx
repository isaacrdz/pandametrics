"use client";

import { CheckIcon, Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface FormHeaderProps {
  title: string;
  subtitle: string;
  submitLabel: string;
  isSubmitting: boolean;
  onBack: () => void;
  // Only passed in edit mode
  onDelete?: () => void;
}

// Page title and the form actions (Back, optional Delete, Submit), shared by every form
export function FormHeader({
  title,
  subtitle,
  submitLabel,
  isSubmitting,
  onBack,
  onDelete,
}: FormHeaderProps) {
  const t = useTranslations("form.actions");

  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
        <p className="mt-1 text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="h-11 rounded-xl border-card-border bg-card px-5 font-semibold text-primary hover:bg-accent hover:text-primary"
        >
          {t("back")}
        </Button>
        {onDelete && (
          <Button
            type="button"
            variant="outline"
            onClick={onDelete}
            className="h-11 rounded-xl border-destructive/40 bg-card px-5 font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            {t("delete")}
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-11 gap-2 rounded-xl px-5 font-semibold shadow-[0_10px_24px_-12px_var(--primary)]"
        >
          {isSubmitting ? (
            <Loader2Icon aria-hidden className="animate-spin motion-reduce:animate-none" />
          ) : (
            <CheckIcon aria-hidden />
          )}
          {isSubmitting ? t("saving") : submitLabel}
        </Button>
      </div>
    </header>
  );
}
