"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, type FieldErrors, type FieldPath, type Resolver } from "react-hook-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CategoryPicker } from "@/components/surveys/form/CategoryPicker";
import { DeleteSurveyDialog } from "@/components/surveys/form/DeleteSurveyDialog";
import { FORM_MODES, type SaveHelpers, type SurveyFormMode } from "@/components/surveys/form/form-modes";
import { PrefillNameFromUrl } from "@/components/surveys/form/PrefillNameFromUrl";
import { QuestionsSection } from "@/components/surveys/form/QuestionsSection";
import { SharePanel } from "@/components/surveys/form/SharePanel";
import { SurveyDetailsSection } from "@/components/surveys/form/SurveyDetailsSection";
import { useActiveLimitParams } from "@/components/layout/AppShellProvider";
import { AppTopBar } from "@/components/layout/AppTopBar";
import { PageHeading } from "@/components/layout/PageHeading";
import { DeleteIconButton, SubmitButton } from "@/components/layout/top-bar-actions";
import { UnsavedChangesDialog } from "@/components/form/UnsavedChangesDialog";
import { useBeforeUnloadWarning } from "@/components/form/form-hooks";
import { WELCOME_PATH } from "@/lib/auth/paths";
import type { SurveyFormMeta } from "@/lib/surveys/form-values";
import { surveyFormSchema, type SurveyFormInput, type SurveyFormValues } from "@/lib/surveys/schema";

// The form edits SurveyFormInput (category may be "" until picked) and submits the parsed values
const resolver = zodResolver(surveyFormSchema) as unknown as Resolver<SurveyFormInput, unknown, SurveyFormValues>;

interface SurveyFormProps {
  mode: SurveyFormMode;
  defaultValues: SurveyFormInput;
  // Edit only: share panel data and category lock
  meta?: SurveyFormMeta;
}

export function SurveyForm({ mode, defaultValues, meta }: SurveyFormProps) {
  const config = FORM_MODES[mode];
  const t = useTranslations("surveyForm");
  const tForm = useTranslations("form.actions");
  const activeLimit = useActiveLimitParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const form = useForm<SurveyFormInput, unknown, SurveyFormValues>({
    resolver,
    defaultValues,
    mode: "onTouched",
  });
  const { isDirty } = form.formState;
  useBeforeUnloadWarning(isDirty && !isPending);

  function goBack() {
    if (isDirty) setLeaveOpen(true);
    else router.push("/dashboard");
  }

  const helpers: SaveHelpers = {
    navigate: (href) => router.push(href),
    reset: (values) => form.reset(values),
    notify: (key) => {
      // Drop leftover error toasts from earlier attempts
      toast.dismiss();
      toast.success(t(`toasts.${key}`));
    },
  };

  function onValid(values: SurveyFormValues) {
    startTransition(async () => {
      const error = await config.save(values, meta, helpers);
      if (!error) return;

      if (error.code === "VALIDATION") {
        for (const fieldError of error.fieldErrors ?? []) {
          form.setError(fieldError.path as FieldPath<SurveyFormInput>, { type: "server", message: fieldError.message });
        }
      }
      if (error.code === "ACTIVE_LIMIT") {
        form.setError("isActive", { type: "server", message: "ACTIVE_LIMIT" });
      }
      // The server says which limit was hit; the page's copy may be outdated
      toast.error(t(`errors.${error.code}`, { ...activeLimit, ...error.activeLimit }));
      // No organization yet (or no longer a member): create one first
      if (error.code === "NO_ORGANIZATION") router.push(WELCOME_PATH);
    });
  }

  function onInvalid(errors: FieldErrors<SurveyFormInput>) {
    toast.error(t("errors.VALIDATION"));
    // react-hook-form focuses fields with a ref; the category radio group has none
    if (!errors.name && !errors.description && errors.category) {
      document.querySelector<HTMLElement>("[id^=category-][role=radio]")?.focus();
    }
  }

  return (
    <FormProvider {...form}>
      {mode === "create" && (
        // Reads the URL: in its own Suspense so the form stays in the static shell
        <Suspense fallback={null}>
          <PrefillNameFromUrl />
        </Suspense>
      )}
      {/* The top bar lives inside the form: its submit button is a real type="submit" */}
      <form onSubmit={form.handleSubmit(onValid, onInvalid)} noValidate className="flex flex-col">
        <AppTopBar
          hideSwitchersWhenNarrow
          heading={
            <PageHeading back={{ onClick: goBack }} title={t(config.titleKey)} subtitle={t(config.subtitleKey)} />
          }
          actions={
            <>
              {config.showDelete && meta && (
                <DeleteIconButton label={t("actions.deleteSurvey")} onClick={() => setDeleteOpen(true)} />
              )}
              <SubmitButton
                label={t(`actions.${config.submitKey}`)}
                pendingLabel={tForm("saving")}
                pending={isPending}
              />
            </>
          }
        />
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
          <SurveyDetailsSection />
          <CategoryPicker locked={config.lockCategory(meta)} />
          <QuestionsSection />
          {config.showShare && meta && (
            <SharePanel code={meta.code} publicUrl={meta.publicUrl} createdAt={meta.createdAt} createdBy={meta.createdBy} />
          )}
        </div>
      </form>
      <UnsavedChangesDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        onDiscard={() => router.push("/dashboard")}
      />
      {config.showDelete && meta && (
        <DeleteSurveyDialog
          surveyId={meta.id}
          surveyName={form.getValues("name")}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
        />
      )}
    </FormProvider>
  );
}
