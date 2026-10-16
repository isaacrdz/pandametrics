"use client";

import { CameraOffIcon, ImageUpIcon, Loader2Icon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type RefObject, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { detectCode } from "@/lib/kiosk/qr";

const SCAN_INTERVAL_MS = 250;

type CameraState = "starting" | "scanning" | "denied" | "noCamera" | "insecure" | "failed";

interface QrScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // A survey code was read; the dialog has already released the camera
  onCode: (code: string) => void;
  // "Upload QR image instead": the parent closes the dialog and opens its file picker
  onUploadInstead: () => void;
  // Opened from a plain button (no DialogTrigger), so focus is handed back to it explicitly
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}

function cameraErrorState(error: unknown): CameraState {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "noCamera";
  return "failed";
}

export function QrScannerDialog({ open, onOpenChange, onCode, onUploadInstead, returnFocusRef }: QrScannerDialogProps) {
  const t = useTranslations("kiosk.qr");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef.current?.focus();
        }}
        className="rounded-2xl sm:max-w-md"
      >
        {/* The shadcn close button has an English-only label; this one is translated */}
        <DialogClose asChild>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t("close")} className="absolute top-2 right-2">
            <XIcon aria-hidden />
          </Button>
        </DialogClose>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("hint")}</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open: unmounting is what releases the camera */}
        {open && <CameraView onCode={onCode} />}
        <Button type="button" variant="outline" onClick={onUploadInstead} className="h-11 gap-2 rounded-xl font-semibold text-primary hover:text-primary">
          <ImageUpIcon aria-hidden />
          {t("uploadInstead")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function CameraView({ onCode }: { onCode: (code: string) => void }) {
  const t = useTranslations("kiosk.qr");
  const videoRef = useRef<HTMLVideoElement>(null);
  const onCodeRef = useRef(onCode);
  // Checked once: getUserMedia only exists on HTTPS (and localhost)
  const [state, setState] = useState<CameraState>(() =>
    typeof window !== "undefined" && window.isSecureContext && typeof navigator.mediaDevices?.getUserMedia === "function" ? "starting" : "insecure",
  );
  const [notSurvey, setNotSurvey] = useState(false);

  useEffect(() => {
    onCodeRef.current = onCode;
  }, [onCode]);

  useEffect(() => {
    if (state !== "starting") return;

    let stopped = false;
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let detecting = false;

    // Every exit path (close, unmount, success, error) goes through here, so the camera light
    // always turns off
    function release() {
      stopped = true;
      window.clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    }

    async function scanFrame() {
      const video = videoRef.current;
      if (stopped || detecting || !video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      detecting = true;
      try {
        const result = await detectCode(video);
        if (stopped) return;
        if (result.status === "code") {
          release();
          onCodeRef.current(result.code);
        } else if (result.status === "notSurvey") {
          setNotSurvey(true);
        }
      } catch {
        if (!stopped) {
          release();
          setState("failed");
        }
      } finally {
        detecting = false;
      }
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((media) => {
        if (stopped) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        const video = videoRef.current;
        if (video) {
          video.srcObject = media;
          video.play().catch(() => undefined);
        }
        setState("scanning");
        timer = window.setInterval(() => void scanFrame(), SCAN_INTERVAL_MS);
      })
      .catch((error: unknown) => {
        if (!stopped) setState(cameraErrorState(error));
      });

    return release;
    // Runs once per mount; "scanning" is set from inside and must not restart the camera
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const failed = state !== "starting" && state !== "scanning";

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          aria-hidden
          className={failed ? "hidden" : "size-full object-cover"}
        />
        {!failed && <ScanFrame />}
        {state === "starting" && (
          <div role="status" className="absolute inset-0 flex items-center justify-center">
            <Loader2Icon aria-hidden className="size-8 animate-spin text-primary" />
            <span className="sr-only">{t("starting")}</span>
          </div>
        )}
        {failed && (
          <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <CameraOffIcon aria-hidden className="size-10 text-muted-foreground" />
            <p className="font-medium">{t(`errors.${state}`)}</p>
          </div>
        )}
      </div>
      {notSurvey && !failed && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {t("notSurvey")}
        </p>
      )}
    </div>
  );
}

// Corner marks where the QR should go
function ScanFrame() {
  const corner = "absolute size-10 border-primary";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-[15%]">
      <span className={`${corner} top-0 left-0 rounded-tl-xl border-t-4 border-l-4`} />
      <span className={`${corner} top-0 right-0 rounded-tr-xl border-t-4 border-r-4`} />
      <span className={`${corner} bottom-0 left-0 rounded-bl-xl border-b-4 border-l-4`} />
      <span className={`${corner} right-0 bottom-0 rounded-br-xl border-r-4 border-b-4`} />
    </div>
  );
}
