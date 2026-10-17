"use client";

import { ImageUpIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { UserAvatar } from "@/components/users/UserAvatar";
import { UserRoleBadge } from "@/components/users/table/UserRowParts";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PlanBadge } from "@/components/plans/PlanBadge";
import type { PlanState } from "@/lib/plans/plan";
import type { Role } from "@/types/survey";

interface ProfilePictureCardProps {
  name: string;
  // The organization the user is working in; null without one
  organizationName: string | null;
  // In the active organization; null without one
  role: Role | null;
  plan: PlanState;
  image: string | null;
  initials: string;
  // Accounts that signed up with email and password; a Google sign-up's photo comes from Google
  canChangePhoto: boolean;
}

// The profile's header card: a tinted cover band with the avatar (or the initials) overlapping it,
// the name as the heading, the organization and badges, then "Change photo" (coming soon, accounts
// that signed up with email and password). Rendered inside the profile <form>, but nothing here
// submits it: a plain button. Signing out lives in the sidebar's user menu.
export function ProfilePictureCard({ name, organizationName, role, plan, image, initials, canChangePhoto }: ProfilePictureCardProps) {
  const t = useTranslations("profile.picture");
  const tForm = useTranslations("form");

  return (
    <section
      aria-labelledby="profile-picture-title"
      className="@container/picture overflow-hidden rounded-3xl border border-card-border bg-card"
    >
      {/* Decorative cover in the brand's tints (light and dark follow the tokens) */}
      <div aria-hidden className="h-24 bg-linear-to-br from-primary/20 via-accent to-primary/5 sm:h-28" />

      <div className="flex flex-col gap-6 px-5 pb-6 sm:px-8 sm:pb-8">
        {/* Wide card: details on the left, the button at the bottom right; stacked below */}
        <div className="flex flex-col gap-5 @xl/picture:flex-row @xl/picture:items-end @xl/picture:justify-between">
          <div className="flex min-w-0 flex-col gap-4">
            {/* Half over the cover; the ring in the card's color cuts it out of the band */}
            <UserAvatar
              image={image}
              initials={initials}
              className="-mt-12 size-24 ring-4 ring-card sm:-mt-14 sm:size-28"
              fallbackClassName="text-2xl sm:text-3xl"
            />
            <div className="flex min-w-0 flex-col gap-3">
              {/* Name and organization read as one block; the badges sit apart below */}
              <div className="flex min-w-0 flex-col gap-1">
                <h2 id="profile-picture-title" className="truncate text-xl leading-tight font-bold text-foreground sm:text-2xl">
                  {name}
                </h2>
                {organizationName && (
                  <p title={organizationName} className="truncate text-muted-foreground">
                    {organizationName}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {role && <UserRoleBadge role={role} />}
                <PlanBadge tier={plan.tier} />
              </div>
            </div>
          </div>

          {canChangePhoto && (
            <Tooltip>
              <TooltipTrigger asChild>
                {/* aria-disabled (not disabled) so the tooltip still shows on hover and focus */}
                <Button
                  type="button"
                  variant="outline"
                  aria-disabled="true"
                  onClick={(event) => event.preventDefault()}
                  className="h-11 w-full cursor-not-allowed gap-2 rounded-xl border-card-border bg-card px-4 font-semibold text-muted-foreground opacity-60 hover:bg-card hover:text-muted-foreground @xl/picture:w-auto"
                >
                  <ImageUpIcon aria-hidden />
                  {t("change")}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{tForm("comingSoon")}</TooltipContent>
            </Tooltip>
          )}
        </div>

        <p className="border-t border-card-border pt-4 text-sm text-muted-foreground">
          {t(canChangePhoto ? "description" : "descriptionGoogle")}
        </p>
      </div>
    </section>
  );
}
