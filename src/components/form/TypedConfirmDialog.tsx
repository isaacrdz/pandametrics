"use client";

import { useId, useState, type ReactNode, type RefObject } from "react";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
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

interface TypedConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  isPending: boolean;
  onConfirm: () => void;
  // Opened without a trigger: where focus goes back when it closes (Radix would try the trigger)
  returnFocusRef?: RefObject<HTMLElement | null>;
}

// A destructive action that needs the confirmation word typed (any case; "delete" / "borrar"). The
// word resets every time the dialog opens, and it can't be closed while the action runs
export function TypedConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pendingLabel,
  isPending,
  onConfirm,
  returnFocusRef,
}: TypedConfirmDialogProps) {
  const t = useTranslations("form.typedConfirm");
  const [typed, setTyped] = useState("");
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setTyped("");
  }
  const inputId = useId();
  const word = t("word");
  const confirmed = typed.trim().toLocaleLowerCase() === word.toLocaleLowerCase();

  function confirm() {
    if (confirmed && !isPending) onConfirm();
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
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="grid gap-2">{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            // React events bubble through the portal: never submit a form the dialog is rendered in
            event.stopPropagation();
            confirm();
          }}
        >
          <Label htmlFor={inputId} className="block leading-normal font-normal text-muted-foreground">
            {t.rich("typeLabel", {
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
          <AlertDialogCancel disabled={isPending}>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending || !confirmed}
            // Solid, so it clearly turns on once the word is typed (the soft variant looks disabled).
            // Important: the action's Slot joins classes without merging, so the variant's would win
            className="bg-destructive! text-background! hover:bg-destructive/90!"
            onClick={(event) => {
              // Keep the dialog open while the action runs
              event.preventDefault();
              confirm();
            }}
          >
            {isPending && <Loader2Icon aria-hidden className="animate-spin motion-reduce:animate-none" />}
            {isPending ? pendingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
