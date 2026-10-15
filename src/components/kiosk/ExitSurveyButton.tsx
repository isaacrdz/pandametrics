"use client";

import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { exitFullscreen } from "@/lib/kiosk/fullscreen";

interface ExitSurveyButtonProps {
  hasAnswers: boolean;
  confirmOpen: boolean;
  onConfirmOpenChange: (open: boolean) => void;
}

// Back to the code entry. With answers in progress it asks first, since they would be lost
export function ExitSurveyButton({ hasAnswers, confirmOpen, onConfirmOpenChange }: ExitSurveyButtonProps) {
  const t = useTranslations("kiosk.runner");
  const router = useRouter();

  function exit() {
    exitFullscreen();
    router.push("/s");
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => (hasAnswers ? onConfirmOpenChange(true) : exit())}
        className="h-11 gap-2 rounded-xl bg-card px-4 font-semibold text-primary shadow-xs hover:text-primary"
      >
        <XIcon aria-hidden />
        {t("exit")}
      </Button>
      <AlertDialog open={confirmOpen} onOpenChange={onConfirmOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("exitTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("exitDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={exit}>
              {t("confirmExit")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
