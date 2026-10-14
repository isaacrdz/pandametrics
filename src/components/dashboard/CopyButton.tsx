"use client";

import { CopyIcon, LinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const ICONS = {
  copy: CopyIcon,
  link: LinkIcon,
};

interface CopyButtonProps {
  value: string;
  // Tooltip text and accessible name
  label: string;
  successMessage: string;
  icon?: keyof typeof ICONS;
  className?: string;
}

// Copies a value and confirms it with a toast (shared by icon and text buttons)
export function useCopyToClipboard() {
  const t = useTranslations("common");

  return async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage, { description: value });
    } catch {
      toast.error(t("copyError"));
    }
  };
}

export function CopyButton({ value, label, successMessage, icon = "copy", className }: CopyButtonProps) {
  const copy = useCopyToClipboard();
  const Icon = ICONS[icon];

  function handleCopy() {
    void copy(value, successMessage);
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} onClick={handleCopy} className={cn(className)}>
          <Icon aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
