"use client";

import { useTransition } from "react";
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

interface DeleteSurveyDialogProps {
  surveyId: string;
  surveyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteSurveyDialog({ surveyId, surveyName, open, onOpenChange }: DeleteSurveyDialogProps) {
  const t = useTranslations("surveyForm");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSurvey(surveyId);
      if (!result.success) {
        toast.error(t(`errors.${result.error.code}`, { limit: 0 }));
        onOpenChange(false);
        return;
      }
      toast.dismiss();
      toast.success(t("toasts.deleted"));
      router.push("/dashboard");
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("delete.title", { name: surveyName })}</AlertDialogTitle>
          <AlertDialogDescription>{t("delete.description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{t("delete.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
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
