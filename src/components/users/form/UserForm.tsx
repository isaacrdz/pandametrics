"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, type FieldPath, type Resolver } from "react-hook-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormHeader } from "@/components/form/FormHeader";
import { UnsavedChangesDialog } from "@/components/form/UnsavedChangesDialog";
import { useBeforeUnloadWarning } from "@/components/form/form-hooks";
import { PasswordSection } from "@/components/users/form/PasswordSection";
import { PermissionsSection } from "@/components/users/form/PermissionsSection";
import { UserDetailsSection } from "@/components/users/form/UserDetailsSection";
import {
  USER_FORM_MODES,
  type UserFormMeta,
  type UserFormMode,
  type UserSaveHelpers,
} from "@/components/users/form/user-form-modes";
import { userFormSchema, type UserFormInput } from "@/lib/users/schema";

const FIELD_NAMES: FieldPath<UserFormInput>[] = ["name", "email", "phone", "password", "confirmPassword"];

interface UserFormProps {
  mode: UserFormMode;
  defaultValues: UserFormInput;
  // Edit only: id, role and status, shown but never sent
  meta?: UserFormMeta;
}

export function UserForm({ mode, defaultValues, meta }: UserFormProps) {
  const config = USER_FORM_MODES[mode];
  const t = useTranslations("userForm");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [leaveOpen, setLeaveOpen] = useState(false);
  // raw: submit the strings as typed. The server parses them again and stores the normalized
  // values (an empty phone becomes null there), so the client never sends transformed output.
  const [resolver] = useState(
    () => zodResolver(userFormSchema(mode), undefined, { raw: true }) as unknown as Resolver<UserFormInput>,
  );
  const form = useForm<UserFormInput>({ resolver, defaultValues, mode: "onTouched" });
  const { isDirty } = form.formState;
  useBeforeUnloadWarning(isDirty && !isPending);

  function goBack() {
    if (isDirty) setLeaveOpen(true);
    else router.push(config.backHref);
  }

  const helpers: UserSaveHelpers = {
    navigate: (href) => router.push(href),
    reset: (values) => form.reset(values),
    notify: (key) => {
      // Drop leftover error toasts from earlier attempts
      toast.dismiss();
      toast.success(t(`toasts.${key}`));
    },
  };

  function onValid(values: UserFormInput) {
    startTransition(async () => {
      const error = await config.save(values, meta, helpers);
      if (!error) return;

      if (error.code === "VALIDATION") {
        for (const fieldError of error.fieldErrors ?? []) {
          const name = FIELD_NAMES.find((field) => field === fieldError.path);
          if (name) form.setError(name, { type: "server", message: fieldError.message });
        }
      }
      if (error.code === "EMAIL_TAKEN") {
        form.setError("email", { type: "server", message: t("errors.EMAIL_TAKEN") }, { shouldFocus: true });
      }
      toast.error(t(`errors.${error.code}`));
    });
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onValid, () => toast.error(t("errors.VALIDATION")))}
        noValidate
        className="flex flex-col gap-8"
      >
        <FormHeader
          title={t(config.titleKey)}
          subtitle={t(config.subtitleKey)}
          submitLabel={t(`actions.${config.submitKey}`)}
          isSubmitting={isPending}
          onBack={goBack}
        />
        <UserDetailsSection isActive={config.showStatus ? meta?.isActive : undefined} />
        <PasswordSection variant={config.passwordVariant} />
        <PermissionsSection role={meta?.role ?? "MEMBER"} isNew={!meta} />
      </form>
      <UnsavedChangesDialog open={leaveOpen} onOpenChange={setLeaveOpen} onDiscard={() => router.push(config.backHref)} />
    </FormProvider>
  );
}
