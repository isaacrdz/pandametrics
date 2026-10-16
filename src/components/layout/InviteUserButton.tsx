"use client";

import { UserPlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Coming soon: people join by signing up; inviting them into an organization comes later. Same
// place and size as NewSurveyButton, but muted
export function InviteUserButton() {
  const t = useTranslations("users");
  const tForm = useTranslations("form");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* aria-disabled (not disabled) so the tooltip still shows on hover and focus */}
        <Button
          type="button"
          variant="outline"
          aria-disabled="true"
          aria-label={t("invite")}
          onClick={(event) => event.preventDefault()}
          className="h-11 cursor-not-allowed gap-2 rounded-full px-3 text-[0.95rem] text-muted-foreground opacity-70 hover:bg-background hover:text-muted-foreground @3xl:px-5"
        >
          <UserPlusIcon aria-hidden className="size-5" />
          <span className="hidden @3xl:inline">{t("invite")}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tForm("comingSoon")}</TooltipContent>
    </Tooltip>
  );
}
