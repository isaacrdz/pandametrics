import { createUser, updateUser, type UserActionResult } from "@/actions/users";
import type { UserFormInput } from "@/lib/users/schema";
import type { Role } from "@/types/survey";

// The only place that knows the difference between creating and editing a user.
// UserForm reads one entry; its sections receive plain props and never see the mode.

export type UserFormMode = "create" | "edit";

export type UserActionError = Extract<UserActionResult<unknown>, { success: false }>["error"];

// Edit only: what the form shows about the user but never sends
export interface UserFormMeta {
  id: string;
  role: Role;
  isActive: boolean;
}

export interface UserSaveHelpers {
  navigate: (href: string) => void;
  reset: (values: UserFormInput) => void;
  notify: (toast: "created" | "saved") => void;
}

interface UserFormModeConfig {
  titleKey: "createTitle" | "editTitle";
  subtitleKey: "createSubtitle" | "editSubtitle";
  submitKey: "create" | "save";
  // create: required password; reset: optional, empty keeps the current one
  passwordVariant: "create" | "reset";
  showStatus: boolean;
  backHref: string;
  // Returns the error to show, or null when the save succeeded
  save: (values: UserFormInput, meta: UserFormMeta | undefined, helpers: UserSaveHelpers) => Promise<UserActionError | null>;
}

export const USER_FORM_MODES: Record<UserFormMode, UserFormModeConfig> = {
  create: {
    titleKey: "createTitle",
    subtitleKey: "createSubtitle",
    submitKey: "create",
    passwordVariant: "create",
    showStatus: false,
    backHref: "/users",
    async save(values, _meta, { navigate, notify }) {
      const result = await createUser(values);
      if (!result.success) return result.error;
      notify("created");
      navigate(`/users/${result.data.id}`);
      return null;
    },
  },
  edit: {
    titleKey: "editTitle",
    subtitleKey: "editSubtitle",
    submitKey: "save",
    passwordVariant: "reset",
    showStatus: true,
    backHref: "/users",
    async save(values, meta, { reset, notify }) {
      if (!meta) return { code: "NOT_FOUND" };
      const result = await updateUser(meta.id, values);
      if (!result.success) return result.error;
      // Normalized values and empty password fields; isDirty goes back to false
      reset(result.data.values);
      notify("saved");
      return null;
    },
  },
};
