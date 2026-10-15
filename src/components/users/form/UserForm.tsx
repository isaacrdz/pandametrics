"use client";

import { useState, useTransition, type ReactNode } from "react";
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

const FIELD_NAMES: FieldPath<UserFormInput>[] = ["name", "email", "phone", "password", "confirmPassword", "currentPassword"];

interface UserFormProps {
  mode: UserFormMode;
  defaultValues: UserFormInput;
  // Edit only: id, role and status, shown but never sent
  meta?: UserFormMeta;
  // Profile only: the picture card next to the form (left half from lg)
  aside?: ReactNode;
}

export function UserForm({ mode, defaultValues, meta, aside }: UserFormProps) {
  const config = USER_FORM_MODES[mode];
  const t = useTranslations("userForm");
  const tRoot = useTranslations();
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
      toast.success(tRoot(key));
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
      if (error.code === "WRONG_PASSWORD") {
        form.setError("currentPassword", { type: "server", message: t("errors.WRONG_PASSWORD") }, { shouldFocus: true });
      }
      toast.error(t(`errors.${error.code}`));
    });
  }

  const sections = (
    <>
      <UserDetailsSection isActive={config.showStatus ? meta?.isActive : undefined} />
      <PasswordSection variant={config.passwordVariant} />
      {config.showPermissions && <PermissionsSection role={meta?.role ?? "MEMBER"} isNew={!meta} />}
    </>
  );

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onValid, () => toast.error(t("errors.VALIDATION")))}
        noValidate
        className="flex flex-col gap-8"
      >
        <FormHeader
          title={tRoot(config.titleKey)}
          subtitle={tRoot(config.subtitleKey)}
          submitLabel={t(`actions.${config.submitKey}`)}
          isSubmitting={isPending}
          onBack={goBack}
        />
        {aside ? (
          // Profile: picture card on the left, the cards on the right, 4 / 8 once the page has
          // 56rem for them (a container: the sidebar takes part of the width); stacked below
          <div className="@container/profile">
            <div className="grid items-start gap-8 @4xl/profile:grid-cols-12">
              <div className="@4xl/profile:sticky @4xl/profile:top-24 @4xl/profile:col-span-4">{aside}</div>
              <div className="flex min-w-0 flex-col gap-8 @4xl/profile:col-span-8">{sections}</div>
            </div>
          </div>
        ) : (
          sections
        )}
      </form>
      <UnsavedChangesDialog open={leaveOpen} onOpenChange={setLeaveOpen} onDiscard={() => router.push(config.backHref)} />
    </FormProvider>
  );
}
