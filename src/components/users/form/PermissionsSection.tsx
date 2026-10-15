"use client";

import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormSection } from "@/components/form/FormSection";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/survey";

const ROLES: Role[] = ["OWNER", "ADMIN", "MEMBER"];

interface PermissionsSectionProps {
  // The user's role, or Member for a new user
  role: Role;
  // A new user has no role yet: Member is the default, not the current one
  isNew: boolean;
}

// Coming soon: a preview of the future role picker. Nothing in it is focusable or submitted.
export function PermissionsSection({ role, isNew }: PermissionsSectionProps) {
  const t = useTranslations("userForm.sections.permissions");
  const tRoles = useTranslations("users.roles");
  const tForm = useTranslations("form");

  return (
    <FormSection
      id="user-permissions"
      number={3}
      title={t("title")}
      description={t("description")}
      badge={tForm("comingSoon")}
    >
      <div aria-disabled="true" className="flex flex-col gap-4">
        <ul className="grid gap-3 opacity-60 sm:grid-cols-3">
          {ROLES.map((value) => {
            const isCurrent = value === role;
            return (
              <li
                key={value}
                className={cn(
                  "flex flex-col gap-1 rounded-2xl border p-4",
                  isCurrent ? "border-primary/50 bg-accent/60" : "border-card-border bg-muted/40",
                )}
              >
                <span className="flex items-center justify-between gap-2 font-semibold text-foreground">
                  {tRoles(value)}
                  {isCurrent && (
                    <span className="flex items-center gap-1 text-xs font-medium text-primary">
                      <CheckIcon aria-hidden className="size-3.5" />
                      {t(isNew ? "default" : "current")}
                    </span>
                  )}
                </span>
                <span className="text-sm text-muted-foreground">{t(`roles.${value}`)}</span>
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-muted-foreground">{t("note")}</p>
      </div>
    </FormSection>
  );
}
