"use client";

import { useState, useTransition } from "react";
import { CircleCheckIcon, CircleDashedIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { deleteSurveys, setSurveysActive, type ActionResult } from "@/actions/surveys";
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
import { BAR_BUTTON_CLASS, SelectionBar } from "@/components/table/SelectionBar";
import { Button } from "@/components/ui/button";
import { ACTIVE_SURVEY_LIMIT } from "@/lib/surveys/constants";

type SuccessKey = "toasts.bulkActivated" | "toasts.bulkDeactivated" | "toasts.bulkDeleted";

interface SurveysSelectionBarProps {
  ids: string[];
  onDone: () => void;
}

// Replaces the filters while rows are selected. Every action is all or nothing on the server.
export function SurveysSelectionBar({ ids, onDone }: SurveysSelectionBarProps) {
  const t = useTranslations("surveys");
  const tErrors = useTranslations("surveyForm.errors");
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const count = ids.length;

  function run(action: () => Promise<ActionResult<{ count: number }>>, successKey: SuccessKey) {
    startTransition(async () => {
      const result = await action();
      setConfirmOpen(false);
      if (!result.success) {
        toast.error(tErrors(result.error.code, { limit: ACTIVE_SURVEY_LIMIT }));
        return;
      }
      toast.success(t(successKey, { count: result.data.count }));
      onDone();
    });
  }

  return (
    <SelectionBar
      label={t("bulk.label")}
      countLabel={t("select.count", { count })}
      disabled={isPending}
      onClear={onDone}
    >
      <Button
        variant="outline"
        disabled={isPending}
        onClick={() => run(() => setSurveysActive(ids, true), "toasts.bulkActivated")}
        className={`${BAR_BUTTON_CLASS} bg-card`}
      >
        <CircleCheckIcon aria-hidden />
        {t("bulk.activate")}
      </Button>
      <Button
        variant="outline"
        disabled={isPending}
        onClick={() => run(() => setSurveysActive(ids, false), "toasts.bulkDeactivated")}
        className={`${BAR_BUTTON_CLASS} bg-card`}
      >
        <CircleDashedIcon aria-hidden />
        {t("bulk.deactivate")}
      </Button>
      <Button
        variant="destructive"
        disabled={isPending}
        onClick={() => setConfirmOpen(true)}
        className={BAR_BUTTON_CLASS}
      >
        <Trash2Icon aria-hidden />
        {t("bulk.delete")}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={(next) => !isPending && setConfirmOpen(next)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("bulk.deleteTitle", { count })}</AlertDialogTitle>
            <AlertDialogDescription>{t("bulk.deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{t("bulk.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={(event) => {
                // Keep the dialog open while the action runs
                event.preventDefault();
                run(() => deleteSurveys(ids), "toasts.bulkDeleted");
              }}
            >
              {isPending && <Loader2Icon aria-hidden className="animate-spin motion-reduce:animate-none" />}
              {isPending ? t("bulk.deleting") : t("bulk.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SelectionBar>
  );
}
