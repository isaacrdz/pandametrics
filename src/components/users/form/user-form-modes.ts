import { updateProfile, updateUser, type UserActionResult } from "@/actions/users";
import type { UserFormInput, UserFormSchemaMode } from "@/lib/users/schema";
import type { Role } from "@/types/survey";

// The only place that knows the difference between editing a user and the own profile (with or
// without a password: Google-only users set a first one). UserForm reads one entry; its sections
// receive plain props and never see the mode. Users join by signing up, so there is no create mode.

export type UserFormMode = "edit" | "profile" | "profileSetPassword";

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

type ToastKey = "userForm.toasts.saved" | "profile.toasts.updated";

interface UserFormModeConfig {
  // Full message keys: the profile has its own namespace
  titleKey: "userForm.editTitle" | "profile.title";
  subtitleKey: "userForm.editSubtitle" | "profile.subtitle";
  // Validation rules on the client (the server action applies its own)
  schemaMode: UserFormSchemaMode;
  // change: optional, and a new password asks for the current one; set: optional first password,
  // no current one (Google-only account)
  // null: no password card (someone else's account: only its owner changes the password)
  passwordVariant: "change" | "set" | null;
  // Someone else's account: the email stays with its owner (the server ignores it)
  emailReadOnly: boolean;
  showStatus: boolean;
  // A user never edits their own role, so the profile has no permissions card
  showPermissions: boolean;
  // Width of the content under the top bar: the profile has the picture card next to the form
  containerClass: "max-w-5xl" | "max-w-6xl";
  backHref: string;
  // Returns the error to show, or null when the save succeeded
  save: (values: UserFormInput, meta: UserFormMeta | undefined, helpers: UserSaveHelpers) => Promise<UserActionError | null>;
}

// Both profile modes: no id, the server edits the signed-in user
const saveProfile: UserFormModeConfig["save"] = async (values, _meta, { reset, notify }) => {
  const result = await updateProfile(values);
  if (!result.success) return result.error;
  reset(result.data.values);
  notify("profile.toasts.updated");
  return null;
};

export const USER_FORM_MODES: Record<UserFormMode, UserFormModeConfig> = {
  edit: {
    titleKey: "userForm.editTitle",
    subtitleKey: "userForm.editSubtitle",
    schemaMode: "edit",
    passwordVariant: null,
    emailReadOnly: true,
    showStatus: true,
    showPermissions: true,
    containerClass: "max-w-5xl",
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
    schemaMode: "profile",
    passwordVariant: "change",
    emailReadOnly: false,
    showStatus: false,
    showPermissions: false,
    containerClass: "max-w-6xl",
    backHref: "/dashboard",
    save: saveProfile,
  },
  profileSetPassword: {
    titleKey: "profile.title",
    subtitleKey: "profile.subtitle",
    schemaMode: "edit",
    passwordVariant: "set",
    emailReadOnly: false,
    showStatus: false,
    showPermissions: false,
    containerClass: "max-w-6xl",
    backHref: "/dashboard",
    save: saveProfile,
  },
};
