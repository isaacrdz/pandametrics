"use client";

import { Controller, useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { FormSection } from "@/components/form/FormSection";
import { useValidationMessage } from "@/components/form/form-hooks";
import { PasswordInput } from "@/components/users/form/PasswordInput";
import { USER_INPUT_CLASS } from "@/components/users/form/UserDetailsSection";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import type { UserFormInput } from "@/lib/users/schema";

interface PasswordSectionProps {
  // reset: optional, an empty pair keeps the current password.
  // change (profile): optional, and a new password asks for the current one first.
  // set (profile of a Google-only user): optional first password, no current one.
  variant: "reset" | "change" | "set";
}

export function PasswordSection({ variant }: PasswordSectionProps) {
  const t = useTranslations("userForm");
  const validationMessage = useValidationMessage();
  const { control } = useFormContext<UserFormInput>();
  const isChange = variant === "change";

  return (
    <FormSection
      id="user-password"
      number={2}
      title={t(`sections.password.${variant}.title`)}
      description={t(`sections.password.${variant}.description`)}
    >
      <FieldGroup className="grid gap-6 @lg:grid-cols-2">
        {isChange && (
          <Controller
            name="currentPassword"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="@lg:col-span-2 @lg:max-w-[calc(50%-0.75rem)]">
                <FieldLabel htmlFor="user-current-password" className="font-semibold text-muted-foreground">
                  {t("fields.currentPassword")}
                </FieldLabel>
                <PasswordInput
                  {...field}
                  id="user-current-password"
                  autoComplete="current-password"
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.invalid ? "user-current-password-error" : undefined}
                  className={USER_INPUT_CLASS}
                />
                <FieldError id="user-current-password-error">{validationMessage(fieldState.error?.message)}</FieldError>
              </Field>
            )}
          />
        )}
        <Controller
          name="password"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="user-password-input" className="font-semibold text-muted-foreground">
                {t(isChange ? "fields.newPassword" : "fields.password")}
              </FieldLabel>
              <PasswordInput
                {...field}
                id="user-password-input"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.invalid ? "user-password-error" : "user-password-rules"}
                className={USER_INPUT_CLASS}
              />
              {fieldState.invalid ? (
                <FieldError id="user-password-error">{validationMessage(fieldState.error?.message)}</FieldError>
              ) : (
                <FieldDescription id="user-password-rules">{t("fields.passwordRules")}</FieldDescription>
              )}
            </Field>
          )}
        />

        <Controller
          name="confirmPassword"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="user-confirm-password" className="font-semibold text-muted-foreground">
                {t("fields.confirmPassword")}
              </FieldLabel>
              <PasswordInput
                {...field}
                id="user-confirm-password"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.invalid ? "user-confirm-password-error" : undefined}
                className={USER_INPUT_CLASS}
              />
              <FieldError id="user-confirm-password-error">{validationMessage(fieldState.error?.message)}</FieldError>
            </Field>
          )}
        />
      </FieldGroup>
    </FormSection>
  );
}
