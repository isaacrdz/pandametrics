"use client";

import { ImageUpIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { UserAvatar } from "@/components/users/UserAvatar";
import { UserRoleBadge } from "@/components/users/table/UserRowParts";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Role } from "@/types/survey";

interface ProfilePictureCardProps {
  name: string;
  email: string;
  role: Role;
  image: string | null;
  initials: string;
}

// Coming soon: shows the avatar (or the initials) with a disabled "Change photo" button.
// Not part of the form: nothing here is submitted.
export function ProfilePictureCard({ name, email, role, image, initials }: ProfilePictureCardProps) {
  const t = useTranslations("profile.picture");
  const tForm = useTranslations("form");

  return (
    <section
      aria-labelledby="profile-picture-title"
      className="flex flex-col gap-6 rounded-3xl border border-card-border bg-card p-5 sm:p-8"
    >
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 id="profile-picture-title" className="text-xl font-bold text-foreground sm:text-2xl">
            {t("title")}
          </h2>
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
            {tForm("comingSoon")}
          </span>
        </div>
        <p className="text-muted-foreground">{t("description")}</p>
      </header>

      {/* Stacked: avatar next to the text. Side column (the profile grid): centered and larger. */}
      <div className="flex items-center gap-5 @4xl/profile:flex-col @4xl/profile:gap-4 @4xl/profile:text-center">
        <UserAvatar
          image={image}
          initials={initials}
          className="size-24 @4xl/profile:size-32"
          fallbackClassName="text-2xl @4xl/profile:text-4xl"
        />
        <div className="flex min-w-0 flex-col gap-1.5 @4xl/profile:items-center">
          <p className="truncate text-lg font-semibold text-foreground">{name}</p>
          <p className="truncate text-sm text-muted-foreground">{email}</p>
          <UserRoleBadge role={role} />
        </div>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          {/* aria-disabled (not disabled) so the tooltip still shows on hover and focus */}
          <Button
            type="button"
            variant="outline"
            aria-disabled="true"
            onClick={(event) => event.preventDefault()}
            className="h-11 w-full cursor-not-allowed gap-2 rounded-xl border-card-border bg-card font-semibold text-muted-foreground opacity-60 hover:bg-card hover:text-muted-foreground @4xl/profile:w-auto @4xl/profile:self-center"
          >
            <ImageUpIcon aria-hidden />
            {t("change")}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{tForm("comingSoon")}</TooltipContent>
      </Tooltip>
    </section>
  );
}
