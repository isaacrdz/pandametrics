import { createSurvey, updateSurvey, type ActionResult } from "@/actions/surveys";
import type { SurveyFormMeta } from "@/lib/surveys/form-values";
import type { SurveyFormInput } from "@/lib/surveys/schema";

// The only place that knows the difference between creating and editing.
// SurveyForm reads one entry; its children receive plain props and never see the mode.

export type SurveyFormMode = "create" | "edit";

type ActionError = Extract<ActionResult<unknown>, { success: false }>["error"];

export interface SaveHelpers {
  navigate: (href: string) => void;
  reset: (values: SurveyFormInput) => void;
  notify: (toast: "created" | "saved") => void;
}

interface FormModeConfig {
  titleKey: "createTitle" | "editTitle";
  subtitleKey: "createSubtitle" | "editSubtitle";
  submitKey: "create" | "save";
  showDelete: boolean;
  showShare: boolean;
  lockCategory: (meta?: SurveyFormMeta) => boolean;
  // Returns the error to show, or null when the save succeeded
  save: (values: SurveyFormInput, meta: SurveyFormMeta | undefined, helpers: SaveHelpers) => Promise<ActionError | null>;
}

export const FORM_MODES: Record<SurveyFormMode, FormModeConfig> = {
  create: {
    titleKey: "createTitle",
    subtitleKey: "createSubtitle",
    submitKey: "create",
    showDelete: false,
    showShare: false,
    lockCategory: () => false,
    async save(values, _meta, { navigate, notify }) {
      const result = await createSurvey(values);
      if (!result.success) return result.error;
      notify("created");
      // The edit page shows the share panel (link and QR), the next thing the user needs
      navigate(`/surveys/${result.data.id}`);
      return null;
    },
  },
  edit: {
    titleKey: "editTitle",
    subtitleKey: "editSubtitle",
    submitKey: "save",
    showDelete: true,
    showShare: true,
    lockCategory: (meta) => meta?.hasResponses ?? false,
    async save(values, meta, { reset, notify }) {
      if (!meta) return { code: "NOT_FOUND" };
      const result = await updateSurvey(meta.id, values);
      if (!result.success) return result.error;
      // New questions and options now have ids; isDirty goes back to false
      reset(result.data.values);
      notify("saved");
      return null;
    },
  },
};
