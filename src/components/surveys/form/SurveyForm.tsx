"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, type FieldErrors, type FieldPath, type Resolver } from "react-hook-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CategoryPicker } from "@/components/surveys/form/CategoryPicker";
import { DeleteSurveyDialog } from "@/components/surveys/form/DeleteSurveyDialog";
import { FORM_MODES, type SaveHelpers, type SurveyFormMode } from "@/components/surveys/form/form-modes";
import { QuestionsSection } from "@/components/surveys/form/QuestionsSection";
import { SharePanel } from "@/components/surveys/form/SharePanel";
import { SurveyDetailsSection } from "@/components/surveys/form/SurveyDetailsSection";
import { FormHeader } from "@/components/form/FormHeader";
import { UnsavedChangesDialog } from "@/components/form/UnsavedChangesDialog";
import { useBeforeUnloadWarning } from "@/components/form/form-hooks";
import { ACTIVE_SURVEY_LIMIT } from "@/lib/surveys/constants";
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
      toast.error(t(`errors.${error.code}`, { limit: ACTIVE_SURVEY_LIMIT }));
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
      <form
        onSubmit={form.handleSubmit(onValid, onInvalid)}
        noValidate
        className="flex flex-col gap-8"
      >
        <FormHeader
          title={t(config.titleKey)}
          subtitle={t(config.subtitleKey)}
          submitLabel={t(`actions.${config.submitKey}`)}
          isSubmitting={isPending}
          onBack={goBack}
          onDelete={config.showDelete && meta ? () => setDeleteOpen(true) : undefined}
        />
        <SurveyDetailsSection />
        <CategoryPicker locked={config.lockCategory(meta)} />
        <QuestionsSection />
        {config.showShare && meta && (
          <SharePanel code={meta.code} publicUrl={meta.publicUrl} createdAt={meta.createdAt} createdBy={meta.createdBy} />
        )}
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
