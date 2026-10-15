import { createUser, updateProfile, updateUser, type UserActionResult } from "@/actions/users";
import type { UserFormInput } from "@/lib/users/schema";
import type { Role } from "@/types/survey";

// The only place that knows the difference between creating and editing a user.
// UserForm reads one entry; its sections receive plain props and never see the mode.

export type UserFormMode = "create" | "edit" | "profile";

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
  notify: (toast: ToastKey) => void;
}

type ToastKey = "userForm.toasts.created" | "userForm.toasts.saved" | "profile.toasts.updated";

interface UserFormModeConfig {
  // Full message keys: the profile has its own namespace
  titleKey: "userForm.createTitle" | "userForm.editTitle" | "profile.title";
  subtitleKey: "userForm.createSubtitle" | "userForm.editSubtitle" | "profile.subtitle";
  submitKey: "create" | "save";
  // create: required password; reset: optional, empty keeps the current one;
  // change: optional, and a new password asks for the current one
  passwordVariant: "create" | "reset" | "change";
  showStatus: boolean;
  // A user never edits their own role, so the profile has no permissions card
  showPermissions: boolean;
  backHref: string;
  // Returns the error to show, or null when the save succeeded
  save: (values: UserFormInput, meta: UserFormMeta | undefined, helpers: UserSaveHelpers) => Promise<UserActionError | null>;
}

export const USER_FORM_MODES: Record<UserFormMode, UserFormModeConfig> = {
  create: {
    titleKey: "userForm.createTitle",
    subtitleKey: "userForm.createSubtitle",
    submitKey: "create",
    passwordVariant: "create",
    showStatus: false,
    showPermissions: true,
    backHref: "/users",
    async save(values, _meta, { navigate, notify }) {
      const result = await createUser(values);
      if (!result.success) return result.error;
      notify("userForm.toasts.created");
      navigate(`/users/${result.data.id}`);
      return null;
    },
  },
  edit: {
    titleKey: "userForm.editTitle",
    subtitleKey: "userForm.editSubtitle",
    submitKey: "save",
    passwordVariant: "reset",
    showStatus: true,
    showPermissions: true,
    backHref: "/users",
    async save(values, meta, { reset, notify }) {
      if (!meta) return { code: "NOT_FOUND" };
      const result = await updateUser(meta.id, values);
      if (!result.success) return result.error;
      // Normalized values and empty password fields; isDirty goes back to false
      reset(result.data.values);
      notify("userForm.toasts.saved");
      return null;
    },
  },
  profile: {
    titleKey: "profile.title",
    subtitleKey: "profile.subtitle",
    submitKey: "save",
    passwordVariant: "change",
    showStatus: false,
    showPermissions: false,
    backHref: "/dashboard",
    async save(values, _meta, { reset, notify }) {
      // No id: the server edits the signed-in user
      const result = await updateProfile(values);
      if (!result.success) return result.error;
      reset(result.data.values);
      notify("profile.toasts.updated");
      return null;
    },
  },
};
