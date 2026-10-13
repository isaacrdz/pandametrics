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

export function CopyButton({ value, label, successMessage, icon = "copy", className }: CopyButtonProps) {
  const t = useTranslations("common");
  const Icon = ICONS[icon];

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage, { description: value });
    } catch {
      toast.error(t("copyError"));
    }
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
