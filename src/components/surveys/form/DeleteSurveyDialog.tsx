"use client";

import { useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { deleteSurvey } from "@/actions/surveys";
import { TypedConfirmDialog } from "@/components/form/TypedConfirmDialog";

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
      if (onDeleted) {
        onOpenChange(false);
        onDeleted();
      } else {
        router.push("/dashboard");
      }
    });
  }

  return (
    <TypedConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("delete.title", { name: surveyName })}
      description={t("delete.description")}
      confirmLabel={t("delete.confirm")}
      pendingLabel={t("delete.deleting")}
      isPending={isPending}
      onConfirm={handleDelete}
      returnFocusRef={returnFocusRef}
    />
  );
}
