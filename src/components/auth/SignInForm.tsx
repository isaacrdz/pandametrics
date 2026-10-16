"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { signInWithPassword } from "@/actions/auth";
import { AuthAlert } from "@/components/auth/AuthAlert";
import { GoogleButton, OrDivider } from "@/components/auth/GoogleButton";
import { toAuthErrorCode, type AuthErrorCode } from "@/components/auth/auth-errors";
import { useValidationMessage } from "@/components/form/form-hooks";
import { PasswordInput } from "@/components/users/form/PasswordInput";
import { USER_INPUT_CLASS } from "@/components/users/form/UserDetailsSection";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DEFAULT_AFTER_SIGN_IN, REGISTER_PATH } from "@/lib/auth/paths";
import { signInSchema } from "@/lib/auth/schema";
import { USER_LIMITS } from "@/lib/users/schema";

interface SignInFormProps {
  callbackUrl: string;
  // ?error= from Auth.js (a Google sign-in that failed) or a previous attempt
  initialError: string | null;
  // Coming from /register
  registered: boolean;
}

type SignInInput = { email: string; password: string };

export function SignInForm({ callbackUrl, initialError, registered }: SignInFormProps) {
  const t = useTranslations("auth");
  const validationMessage = useValidationMessage();
  const [error, setError] = useState<AuthErrorCode | null>(() => toAuthErrorCode(initialError));
  const [isPending, startTransition] = useTransition();
  const [resolver] = useState(() => zodResolver(signInSchema, undefined, { raw: true }) as unknown as Resolver<SignInInput>);
  const form = useForm<SignInInput>({ resolver, defaultValues: { email: "", password: "" }, mode: "onTouched" });

  function onValid(values: SignInInput) {
    setError(null);
    startTransition(async () => {
      // Success redirects (the session cookie is set on the way); only failures come back
      const result = await signInWithPassword(values, callbackUrl);
      setError(result.error);
      form.setValue("password", "");
      form.setFocus("password");
    });
  }

  const registerHref = callbackUrl === DEFAULT_AFTER_SIGN_IN ? REGISTER_PATH : `${REGISTER_PATH}?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{t("signIn.title")}</h1>
        <p className="text-muted-foreground">{t("signIn.subtitle")}</p>
      </header>

      {error ? (
        <AuthAlert tone="error">{t(`errors.${error}`)}</AuthAlert>
      ) : (
        registered && <AuthAlert tone="success">{t("signIn.registered")}</AuthAlert>
      )}

      <GoogleButton callbackUrl={callbackUrl} />
      <OrDivider />

      <form onSubmit={form.handleSubmit(onValid)} noValidate className="flex flex-col gap-6">
        <FieldGroup className="gap-5">
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="sign-in-email" className="font-semibold text-muted-foreground">
                  {t("fields.email")}
                </FieldLabel>
                <Input
                  {...field}
                  id="sign-in-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.invalid ? "sign-in-email-error" : undefined}
                  className={USER_INPUT_CLASS}
                />
                <FieldError id="sign-in-email-error">
                  {validationMessage(fieldState.error?.message, { max: USER_LIMITS.email })}
                </FieldError>
              </Field>
            )}
          />
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="sign-in-password" className="font-semibold text-muted-foreground">
                  {t("fields.password")}
                </FieldLabel>
                <PasswordInput
                  {...field}
                  id="sign-in-password"
                  autoComplete="current-password"
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.invalid ? "sign-in-password-error" : undefined}
                  className={USER_INPUT_CLASS}
                />
                <FieldError id="sign-in-password-error">
                  {validationMessage(fieldState.error?.message, { max: USER_LIMITS.passwordMax })}
                </FieldError>
              </Field>
            )}
          />
        </FieldGroup>

        <Button type="submit" disabled={isPending} className="h-12 w-full gap-2 rounded-xl text-[0.95rem] font-semibold">
          {isPending && <Loader2Icon aria-hidden className="animate-spin" />}
          {isPending ? t("signIn.pending") : t("signIn.submit")}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t("signIn.noAccount")}{" "}
        <Link href={registerHref} className="font-semibold text-primary underline-offset-4 hover:underline">
          {t("signIn.register")}
        </Link>
      </p>
    </div>
  );
}
