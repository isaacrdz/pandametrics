"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Upgrade and Renew until there is a payment provider: muted, with a "Coming soon" tooltip.
// aria-disabled (not disabled), so the tooltip still shows on hover and focus
export function ComingSoonButton({ children, className }: { children: ReactNode; className?: string }) {
  const t = useTranslations("form");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-disabled="true"
          onClick={(event) => event.preventDefault()}
          className={cn(
            "cursor-not-allowed rounded-full text-muted-foreground opacity-70 hover:bg-background hover:text-muted-foreground",
            className,
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t("comingSoon")}</TooltipContent>
    </Tooltip>
  );
}
