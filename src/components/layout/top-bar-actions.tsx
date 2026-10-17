"use client";

import { CheckIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Form actions for the top bar. They render inside the page's <form>, so the submit button is a
// real type="submit" that knows the form's pending state.

interface SubmitButtonProps {
  label: string;
  pendingLabel: string;
  pending: boolean;
  // While the form is still loading (edit pages' Suspense fallback)
  disabled?: boolean;
}

export function SubmitButton({ label, pendingLabel, pending, disabled = false }: SubmitButtonProps) {
  const text = pending ? pendingLabel : label;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* The label shows when the bar has room (42rem); below that, the icon carries the name */}
        <Button
          type="submit"
          disabled={pending || disabled}
          aria-label={text}
          className="h-11 gap-2 rounded-full px-3 text-[0.95rem] font-semibold shadow-[0_10px_24px_-12px_var(--primary)] @2xl:px-5"
        >
          {pending ? (
            <Loader2Icon aria-hidden className="size-5 animate-spin motion-reduce:animate-none" />
          ) : (
            <CheckIcon aria-hidden className="size-5" />
          )}
          <span className="hidden @2xl:inline">{text}</span>
        </Button>
      </TooltipTrigger>
      {/* Rendered in a portal, outside the bar's container, so it cannot follow the label's
          container query: it shows at every width (redundant, but harmless, when the label shows) */}
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}
