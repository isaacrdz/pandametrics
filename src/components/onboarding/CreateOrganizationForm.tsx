"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { Building2Icon, Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { createOrganization, type OrganizationActionErrorCode } from "@/actions/organizations";
import { AuthAlert } from "@/components/auth/AuthAlert";
import { useValidationMessage } from "@/components/form/form-hooks";
import { USER_INPUT_CLASS } from "@/components/users/form/UserDetailsSection";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ORGANIZATION_NAME_MAX, organizationSchema, type OrganizationInput } from "@/lib/organizations/schema";
import { MAX_MEMBERSHIPS } from "@/lib/plans/limits";

const FIELD_ID = "organization-name";

// /welcome: a signed-in user without an organization creates theirs. On success the action makes it
// the active one and sends the user to its dashboard
export function CreateOrganizationForm({ userName }: { userName: string | null }) {
  const t = useTranslations("onboarding");
  const tErrors = useTranslations("organizations.errors");
  const validationMessage = useValidationMessage();
  const [error, setError] = useState<OrganizationActionErrorCode | null>(null);
  const [isPending, startTransition] = useTransition();
  const [resolver] = useState(
    () => zodResolver(organizationSchema, undefined, { raw: true }) as unknown as Resolver<OrganizationInput>,
  );
  const form = useForm<OrganizationInput>({ resolver, defaultValues: { name: "" }, mode: "onTouched" });

  function onValid(values: OrganizationInput) {
    setError(null);
    startTransition(async () => {
      const result = await createOrganization(values);
      // Success redirects; only errors come back
      if (result.success) return;
      for (const fieldError of result.error.fieldErrors ?? []) {
        if (fieldError.path === "name") form.setError("name", { type: "server", message: fieldError.message });
      }
      setError(result.error.code);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          {userName ? t("title", { name: userName }) : t("titleNoName")}
        </h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </header>

      {error && error !== "VALIDATION" && (
        <AuthAlert tone="error">{tErrors(error, { max: MAX_MEMBERSHIPS })}</AuthAlert>
      )}

      <section aria-labelledby="create-organization-title" className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Building2Icon className="size-5" />
          </span>
          <div className="flex flex-col gap-0.5">
            <h2 id="create-organization-title" className="font-semibold text-foreground">
              {t("create.title")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("create.description")}</p>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onValid)} noValidate className="flex flex-col gap-5">
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={FIELD_ID} className="font-semibold text-muted-foreground">
                  {t("create.name")}
                </FieldLabel>
                <Input
                  {...field}
                  id={FIELD_ID}
                  autoComplete="organization"
                  placeholder={userName ?? undefined}
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.invalid ? `${FIELD_ID}-error` : `${FIELD_ID}-hint`}
                  className={USER_INPUT_CLASS}
                />
                {fieldState.invalid ? (
                  <FieldError id={`${FIELD_ID}-error`}>
                    {validationMessage(fieldState.error?.message, { max: ORGANIZATION_NAME_MAX })}
                  </FieldError>
                ) : (
                  <FieldDescription id={`${FIELD_ID}-hint`}>{t("create.hint")}</FieldDescription>
                )}
              </Field>
            )}
          />

          <Button type="submit" disabled={isPending} className="h-12 w-full gap-2 rounded-xl text-[0.95rem] font-semibold">
            {isPending && <Loader2Icon aria-hidden className="animate-spin" />}
            {isPending ? t("create.pending") : t("create.submit")}
          </Button>
        </form>
      </section>
    </div>
  );
}
