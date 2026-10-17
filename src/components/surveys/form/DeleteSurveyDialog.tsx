"use client";

import { useId, useState, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { deleteSurvey } from "@/actions/surveys";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeleteSurveyDialogProps {
  surveyId: string;
  surveyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Called after a successful delete instead of going to the dashboard (the survey table stays)
  onDeleted?: () => void;
  // Opened without a trigger: where focus goes back when it closes (Radix would try the trigger)
  returnFocusRef?: RefObject<HTMLElement | null>;
}

export function DeleteSurveyDialog({ surveyId, surveyName, open, onOpenChange, onDeleted, returnFocusRef }: DeleteSurveyDialogProps) {
  const t = useTranslations("surveyForm");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Deleting needs the confirmation word typed (any case); it resets every time the dialog opens
  const [typed, setTyped] = useState("");
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setTyped("");
  }
  const inputId = useId();
  const word = t("delete.word");
  const confirmed = typed.trim().toLocaleLowerCase() === word.toLocaleLowerCase();

  function handleDelete() {
    if (!confirmed) return;
    startTransition(async () => {
      const result = await deleteSurvey(surveyId);
      if (!result.success) {
        toast.error(t(`errors.${result.error.code}`, { limit: 0 }));
        onOpenChange(false);
        return;
      }
      toast.dismiss();
      toast.success(t("toasts.deleted"));
      if (onDeleted) {
        onOpenChange(false);
        onDeleted();
      } else {
        router.push("/dashboard");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          const element = returnFocusRef?.current;
          if (!element?.isConnected) return;
          event.preventDefault();
          element.focus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{t("delete.title", { name: surveyName })}</AlertDialogTitle>
          <AlertDialogDescription>{t("delete.description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            handleDelete();
          }}
        >
          <Label htmlFor={inputId} className="block leading-normal font-normal text-muted-foreground">
            {t.rich("delete.typeLabel", {
              word,
              strong: (chunks) => <span className="font-semibold text-foreground">{chunks}</span>,
            })}
          </Label>
          <Input
            id={inputId}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            disabled={isPending}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="h-11 rounded-xl px-3"
          />
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{t("delete.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending || !confirmed}
            // Solid, so it clearly turns on once the word is typed (the soft variant looks disabled).
            // Important: the action's Slot joins classes without merging, so the variant's would win
            className="bg-destructive! text-background! hover:bg-destructive/90!"
            onClick={(event) => {
              // Keep the dialog open while the action runs
              event.preventDefault();
              handleDelete();
            }}
          >
            {isPending && <Loader2Icon aria-hidden className="animate-spin motion-reduce:animate-none" />}
            {isPending ? t("delete.deleting") : t("delete.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
