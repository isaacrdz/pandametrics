"use client";

import type { ComponentProps } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

// Light table checkbox: a grey-pink outline at rest (--control-border, 3:1 on card and page),
// pink only when checked or indeterminate, and a solid focus ring. The shared Checkbox keeps
// the shadcn defaults; only the table looks like this.
const TABLE_CHECKBOX =
  "size-4.5 rounded-[5px] border-control-border bg-card shadow-none dark:bg-card " +
  "data-checked:border-primary data-checked:bg-primary " +
  "data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground " +
  "dark:data-[state=indeterminate]:bg-primary " +
  "focus-visible:border-control-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card";

export function SurveyCheckbox({ className, ...props }: ComponentProps<typeof Checkbox>) {
  return <Checkbox className={cn(TABLE_CHECKBOX, className)} {...props} />;
}
