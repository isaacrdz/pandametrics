"use client";

import { ArrowRightIcon, ImageUpIcon, Loader2Icon, ScanQrCodeIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { enterFullscreen } from "@/lib/kiosk/fullscreen";
import { SURVEY_CODE_LENGTH, parseSurveyCode } from "@/lib/surveys/code";
import { cn } from "@/lib/utils";

// Keeps what a person can type into a code: letters and digits, uppercase, at most 6. A pasted
// link or message is reduced to the code inside it
function toCodeInput(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length <= SURVEY_CODE_LENGTH) return cleaned;
  return parseSurveyCode(raw) ?? cleaned.slice(0, SURVEY_CODE_LENGTH);
}

interface CodeEntryProps {
  // The ?code= value when it could not be read as a code
  invalidValue?: string;
}

export function CodeEntry({ invalidValue }: CodeEntryProps) {
  const t = useTranslations("kiosk.codeEntry");
  const router = useRouter();
  const inputId = useId();
  const errorId = useId();
  const [code, setCode] = useState(() => (invalidValue ? toCodeInput(invalidValue) : ""));
  const [showError, setShowError] = useState(invalidValue !== undefined);
  const [pending, startTransition] = useTransition();
  const complete = code.length === SURVEY_CODE_LENGTH;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!complete || pending) return;
    // The submit is a user gesture, the only moment a browser lets the kiosk go fullscreen
    enterFullscreen();
    startTransition(() => router.push(`/s?code=${code}`));
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className="sr-only">
          {t("codeLabel")}
        </label>
        <Input
          id={inputId}
          value={code}
          onChange={(event) => {
            setCode(toCodeInput(event.target.value));
            setShowError(false);
          }}
          placeholder={t("codeLabel")}
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={showError || undefined}
          aria-describedby={showError ? errorId : undefined}
          className={cn("h-12 rounded-xl bg-card px-4 text-base", code && "font-mono tracking-[0.3em]")}
        />
        {showError && (
          <p id={errorId} role="alert" className="text-sm font-medium text-destructive">
            {t("invalid")}
          </p>
        )}
      </div>

      <Button type="submit" disabled={!complete || pending} className="h-11 w-fit gap-2 rounded-xl px-6 text-[0.95rem] font-semibold">
        {t("continue")}
        {pending ? <Loader2Icon aria-hidden className="animate-spin" /> : <ArrowRightIcon aria-hidden />}
      </Button>

      <div className="flex flex-wrap gap-3">
        <ComingSoonButton icon={<ScanQrCodeIcon aria-hidden />} label={t("scanQr")} />
        <ComingSoonButton icon={<ImageUpIcon aria-hidden />} label={t("uploadQr")} />
      </div>
    </form>
  );
}

// Scan / upload arrive with the QR phase. aria-disabled instead of disabled keeps the button
// focusable, so the "Coming soon" tooltip shows on hover and on focus
function ComingSoonButton({ icon, label }: { icon: ReactNode; label: string }) {
  const t = useTranslations("kiosk.codeEntry");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-disabled
          onClick={(event) => event.preventDefault()}
          className="h-10 cursor-not-allowed gap-2 rounded-xl bg-card font-semibold text-primary opacity-60 hover:bg-card hover:text-primary"
        >
          {icon}
          {label}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t("comingSoon")}</TooltipContent>
    </Tooltip>
  );
}
