"use client";

import { ArrowRightIcon, ImageUpIcon, Loader2Icon, ScanQrCodeIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useId, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QrScannerDialog } from "@/components/kiosk/QrScannerDialog";
import { markKioskEntry } from "@/lib/kiosk/client-meta";
import { enterFullscreen } from "@/lib/kiosk/fullscreen";
import { detectCode } from "@/lib/kiosk/qr";
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
  const [scannerOpen, setScannerOpen] = useState(false);
  const [reading, setReading] = useState(false);
  const [qrError, setQrError] = useState<"noQr" | "notSurvey" | "failed" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanButtonRef = useRef<HTMLButtonElement>(null);
  const complete = code.length === SURVEY_CODE_LENGTH;
  const tQr = useTranslations("kiosk.qr");

  // Typed, scanned or uploaded: the same way into the survey
  function openSurvey(surveyCode: string) {
    // Fullscreen is only allowed from a user gesture: it works for Continue and the upload,
    // and is refused quietly after a camera scan (the runner's toggle is still there)
    enterFullscreen();
    // Answers opened from here count as KIOSK; a shared link opened directly counts as LINK
    markKioskEntry(surveyCode);
    startTransition(() => router.push(`/s?code=${surveyCode}`));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!complete || pending) return;
    openSurvey(code);
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Cleared so picking the same image again still fires a change
    event.target.value = "";
    if (!file) return;

    setReading(true);
    setQrError(null);
    let bitmap: ImageBitmap | null = null;
    try {
      bitmap = await createImageBitmap(file);
      const result = await detectCode(bitmap);
      if (result.status === "code") {
        setCode(result.code);
        openSurvey(result.code);
      } else {
        setQrError(result.status === "notSurvey" ? "notSurvey" : "noQr");
      }
    } catch {
      setQrError("failed");
    } finally {
      // Decoded images can be large; free them even when detection fails
      bitmap?.close();
      setReading(false);
    }
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

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-3">
          <Button
            ref={scanButtonRef}
            type="button"
            variant="outline"
            onClick={() => {
              setQrError(null);
              setScannerOpen(true);
            }}
            className={QR_BUTTON_CLASS}
          >
            <ScanQrCodeIcon aria-hidden />
            {t("scanQr")}
          </Button>
          <Button type="button" variant="outline" disabled={reading} onClick={() => fileInputRef.current?.click()} className={QR_BUTTON_CLASS}>
            {reading ? <Loader2Icon aria-hidden className="animate-spin" /> : <ImageUpIcon aria-hidden />}
            {t("uploadQr")}
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" tabIndex={-1} aria-hidden className="sr-only" onChange={(event) => void handleFile(event)} />
        </div>
        {qrError && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {tQr(`errors.${qrError}`)}
          </p>
        )}
      </div>

      <QrScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        returnFocusRef={scanButtonRef}
        onCode={(scanned) => {
          setScannerOpen(false);
          setCode(scanned);
          openSurvey(scanned);
        }}
        onUploadInstead={() => {
          setScannerOpen(false);
          // Still inside the click, so the browser opens the file picker
          fileInputRef.current?.click();
        }}
      />
    </form>
  );
}

const QR_BUTTON_CLASS = "h-10 gap-2 rounded-xl bg-card font-semibold text-primary hover:text-primary";
