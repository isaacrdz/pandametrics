"use client";

import { Controller, useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { FormSection } from "@/components/form/FormSection";
import { RequiredMark } from "@/components/form/RequiredMark";
import { useValidationMessage } from "@/components/form/form-hooks";
import { UserStatusPill } from "@/components/users/table/UserRowParts";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { USER_LIMITS, type UserFormInput } from "@/lib/users/schema";
import { cn } from "@/lib/utils";

export const USER_INPUT_CLASS = "h-12 rounded-xl bg-muted/60 px-4 text-[0.95rem]";

interface UserDetailsSectionProps {
  // Edit only: the status is shown, never edited here (it changes from the user list)
  isActive?: boolean;
  // Someone else's account: the email is shown but only its owner changes it
  emailReadOnly?: boolean;
}

export function UserDetailsSection({ isActive, emailReadOnly = false }: UserDetailsSectionProps) {
  const t = useTranslations("userForm");
  const validationMessage = useValidationMessage();
  const { control } = useFormContext<UserFormInput>();

  return (
    <FormSection
      id="user-details"
      number={1}
      title={t("sections.details.title")}
      description={t("sections.details.description")}
    >
      <FieldGroup className="gap-6">
        <Controller
          name="name"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="user-name" className="font-semibold text-muted-foreground">
                {t("fields.name")} <RequiredMark />
              </FieldLabel>
              <Input
                {...field}
                id="user-name"
                autoComplete="name"
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.invalid ? "user-name-error" : undefined}
                className={USER_INPUT_CLASS}
              />
              <FieldError id="user-name-error">
                {validationMessage(fieldState.error?.message, { max: USER_LIMITS.name })}
              </FieldError>
            </Field>
          )}
        />

        <div className="grid gap-6 @lg:grid-cols-2">
          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="user-email" className="font-semibold text-muted-foreground">
                  {t("fields.email")} <RequiredMark />
                </FieldLabel>
                <Input
                  {...field}
                  id="user-email"
                  type="email"
                  autoComplete="email"
                  readOnly={emailReadOnly}
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.invalid ? "user-email-error" : emailReadOnly ? "user-email-hint" : undefined}
                  className={cn(USER_INPUT_CLASS, emailReadOnly && "cursor-default bg-muted text-muted-foreground")}
                />
                {emailReadOnly && !fieldState.invalid ? (
                  <FieldDescription id="user-email-hint">{t("fields.emailOwnerOnly")}</FieldDescription>
                ) : (
                  <FieldError id="user-email-error">
                    {validationMessage(fieldState.error?.message, { max: USER_LIMITS.email })}
                  </FieldError>
                )}
              </Field>
            )}
          />

          <Controller
            name="phone"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="user-phone" className="font-semibold text-muted-foreground">
                  {t("fields.phone")}
                </FieldLabel>
                <Input
                  {...field}
                  id="user-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder={t("fields.phonePlaceholder")}
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.invalid ? "user-phone-error" : undefined}
                  className={USER_INPUT_CLASS}
                />
                <FieldError id="user-phone-error">{validationMessage(fieldState.error?.message)}</FieldError>
              </Field>
            )}
          />
        </div>

        {isActive !== undefined && (
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <UserStatusPill isActive={isActive} />
            {t("statusHint")}
          </p>
        )}
      </FieldGroup>
    </FormSection>
  );
}
