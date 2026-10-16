"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type FieldPath, type Resolver } from "react-hook-form";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { AuthAlert } from "@/components/auth/AuthAlert";
import { GoogleButton, OrDivider } from "@/components/auth/GoogleButton";
import { toAuthErrorCode, type AuthErrorCode } from "@/components/auth/auth-errors";
import { useValidationMessage } from "@/components/form/form-hooks";
import { PasswordInput } from "@/components/users/form/PasswordInput";
import { USER_INPUT_CLASS } from "@/components/users/form/UserDetailsSection";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DEFAULT_AFTER_SIGN_IN, SIGN_IN_PATH } from "@/lib/auth/paths";
import { registerSchema, type RegisterInput } from "@/lib/auth/schema";
import { USER_LIMITS } from "@/lib/users/schema";

const EMPTY: RegisterInput = { name: "", email: "", password: "", confirmPassword: "" };

const FIELD_NAMES: FieldPath<RegisterInput>[] = ["name", "email", "password", "confirmPassword"];

// Max length per field, for the "Use {max} characters or fewer" message
const MAX: Record<FieldPath<RegisterInput>, number> = {
  name: USER_LIMITS.name,
  email: USER_LIMITS.email,
  password: USER_LIMITS.passwordMax,
  confirmPassword: USER_LIMITS.passwordMax,
};

interface ApiError {
  code: string;
  fieldErrors?: { path: string; message: string }[];
}

export function RegisterForm({ callbackUrl }: { callbackUrl: string }) {
  const t = useTranslations("auth");
  const validationMessage = useValidationMessage();
  const router = useRouter();
  const [error, setError] = useState<AuthErrorCode | null>(null);
  const [isPending, startTransition] = useTransition();
  const [resolver] = useState(() => zodResolver(registerSchema, undefined, { raw: true }) as unknown as Resolver<RegisterInput>);
  const form = useForm<RegisterInput>({ resolver, defaultValues: EMPTY, mode: "onTouched" });

  function onValid(values: RegisterInput) {
    setError(null);
    startTransition(async () => {
      let apiError: ApiError;
      try {
        const response = await fetch("/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (response.ok) {
          const params = new URLSearchParams({ registered: "1" });
          if (callbackUrl !== DEFAULT_AFTER_SIGN_IN) params.set("callbackUrl", callbackUrl);
          router.push(`${SIGN_IN_PATH}?${params}`);
          return;
        }
        apiError = ((await response.json()) as { error: ApiError }).error;
      } catch {
        apiError = { code: "UNKNOWN" };
      }

      for (const fieldError of apiError.fieldErrors ?? []) {
        const name = FIELD_NAMES.find((field) => field === fieldError.path);
        if (name) form.setError(name, { type: "server", message: fieldError.message });
      }
      if (apiError.code === "EMAIL_TAKEN") {
        form.setError("email", { type: "server", message: t("errors.EMAIL_TAKEN") }, { shouldFocus: true });
      }
      setError(toAuthErrorCode(apiError.code));
    });
  }

  function textField(name: "name" | "email", type: "text" | "email", autoComplete: string, hint?: string) {
    const id = `register-${name}`;
    return (
      <Controller
        name={name}
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={id} className="font-semibold text-muted-foreground">
              {t(`fields.${name}`)}
            </FieldLabel>
            <Input
              {...field}
              id={id}
              type={type}
              autoComplete={autoComplete}
              aria-invalid={fieldState.invalid}
              aria-describedby={fieldState.invalid ? `${id}-error` : hint ? `${id}-hint` : undefined}
              className={USER_INPUT_CLASS}
            />
            {fieldState.invalid ? (
              <FieldError id={`${id}-error`}>{validationMessage(fieldState.error?.message, { max: MAX[name] })}</FieldError>
            ) : (
              hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>
            )}
          </Field>
        )}
      />
    );
  }

  function passwordField(name: "password" | "confirmPassword", hint?: string) {
    const id = `register-${name}`;
    return (
      <Controller
        name={name}
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={id} className="font-semibold text-muted-foreground">
              {t(`fields.${name}`)}
            </FieldLabel>
            <PasswordInput
              {...field}
              id={id}
              autoComplete="new-password"
              aria-invalid={fieldState.invalid}
              aria-describedby={fieldState.invalid ? `${id}-error` : hint ? `${id}-hint` : undefined}
              className={USER_INPUT_CLASS}
            />
            {fieldState.invalid ? (
              <FieldError id={`${id}-error`}>{validationMessage(fieldState.error?.message, { max: MAX[name] })}</FieldError>
            ) : (
              hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>
            )}
          </Field>
        )}
      />
    );
  }

  const signInHref = callbackUrl === DEFAULT_AFTER_SIGN_IN ? SIGN_IN_PATH : `${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{t("register.title")}</h1>
        <p className="text-muted-foreground">{t("register.subtitle")}</p>
      </header>

      {error && <AuthAlert tone="error">{t(`errors.${error}`)}</AuthAlert>}

      <GoogleButton callbackUrl={callbackUrl} />
      <OrDivider />

      <form onSubmit={form.handleSubmit(onValid)} noValidate className="flex flex-col gap-6">
        <FieldGroup className="gap-5">
          {textField("name", "text", "name")}
          {textField("email", "email", "email")}
          {passwordField("password", t("fields.passwordRules"))}
          {passwordField("confirmPassword")}
        </FieldGroup>

        <Button type="submit" disabled={isPending} className="h-12 w-full gap-2 rounded-xl text-[0.95rem] font-semibold">
          {isPending && <Loader2Icon aria-hidden className="animate-spin" />}
          {isPending ? t("register.pending") : t("register.submit")}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t("register.haveAccount")}{" "}
        <Link href={signInHref} className="font-semibold text-primary underline-offset-4 hover:underline">
          {t("register.signIn")}
        </Link>
      </p>
    </div>
  );
}
