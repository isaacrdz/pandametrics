# Users Phase 2 — Create and Edit Form Spec

## Overview

Phase 2 of 3 of user management: one `UserForm` for `/users/new` and `/users/[id]`, designed like the survey form (numbered cards with a header and subheader):

- **01 Details**: name, email, phone;
- **02 Password**: create password (create) or reset password (edit);
- **03 Permissions**: "Coming soon".

Requires phase 1 (user store, list, Users nav item). Phase 3 reuses this form for the profile. Full research in `docs/users.md` (sections 2 and 4).

## Decisions (from the research)

- **One form, modes in one place**: `USER_FORM_MODES` (`create`, `edit`; `profile` is added in phase 3) is the only code that knows the difference, like `FORM_MODES`.
- **Shared form pieces** move to `src/components/form/` so the survey form and the user form use the same ones; the survey form must not change.
- **No delete and no status control in the form**: users are deactivated or deleted (soft delete) from the list.
- **Permissions are not editable yet**: new users are created as `MEMBER`; the card only shows a disabled preview.
- **Edit never shows the current password**; an empty password keeps it.
- **No "send reset link"** (there is no email service yet).

## Requirements

### Shared form pieces (`src/components/form/`)

Move without behavior change and update the survey form imports:

- `FormSection` — add an optional `badge` prop (rendered next to the title, used for "Coming soon");
- `RequiredMark`;
- form header (title, subtitle, Back, optional Delete, Submit with pending state) — labels as props instead of reading `surveyForm.actions`;
- `useBeforeUnloadWarning`, `useValidationMessage`;
- `UnsavedChangesDialog` — the discard target as a prop.

### Schema (`src/lib/users/schema.ts`)

Zod, shared by client and server, messages as `validation.*` keys:

- `name`: trimmed, 1–80;
- `email`: trimmed, lowercased, valid email, ≤ 254;
- `phone`: optional; normalized (remove spaces, dashes, parentheses; keep a leading `+`); 7–15 digits;
- `password` / `confirmPassword`: 8–72 chars, at least one letter and one number; must match. Required in `create`; in `edit` both optional, but if one is filled both are validated.

`userFormSchema(mode)` returns the right shape; values for the form come from `toUserFormValues(user)` (password fields empty).

### Service and actions

- `src/lib/users/service.ts`: `createUser(scope, input)` (hash, `isActive: true`, `role: MEMBER`, `organizationId` from the scope) and `updateUser(scope, id, input)` (name, email, phone; new hash only when a password was sent). Email unique across all users (`EMAIL_TAKEN`); other organization's id → `NOT_FOUND`.
- `src/actions/users.ts`: `createUser(values)` → `{ id }`; `updateUser(id, values)` → `{ values }` (normalized, password fields empty). Server-side Zod validation with field errors, `ActionResult` and codes like the survey actions. Revalidate `/users`, and the layout (`revalidatePath("/", "layout")`) on update, because names appear in the sidebar, greeting and "created by".

### Pages

- `src/app/(app)/users/new/page.tsx`: `UserForm mode="create"` with empty values; metadata "New user · Panda Metrics".
- `src/app/(app)/users/[id]/page.tsx`: `params` read inside Suspense, `notFound()` for unknown or other organization's ids, `UserFormSkeleton` as fallback. If the id is the current user, redirect to `/profile` once phase 3 exists (until then, edit normally).
- Width `max-w-5xl`, like the survey form.

### Form (`src/components/users/form/`)

- `UserForm` (react-hook-form + Zod resolver, `mode: "onTouched"`), `user-form-modes.ts`:

| | `create` | `edit` |
| --- | --- | --- |
| Title / subtitle | "New user" / "Add a person to your organization." | "Edit user" / "Update the user's details and access." |
| Submit | "Create user" | "Save changes" |
| Password card | create, required | reset, optional |
| After save | toast "User created", go to `/users/[id]` | toast "Changes saved", reset with returned values |
| Back / discard | `/users` | `/users` |

- Header: Back (outline) and Submit. Unsaved changes dialog on Back, `beforeunload` warning while dirty.
- Server errors: `VALIDATION` field errors with `setError`; `EMAIL_TAKEN` on the email field; other codes as toasts.
- **`UserDetailsSection`** (`FormSection` 1, "User details" / "Name and contact information."): Name (required, `autoComplete="name"`) full width; Email (required, `type="email"`, `autoComplete="email"`) and Phone (optional, `type="tel"`, `inputMode="tel"`, `autoComplete="tel"`, placeholder `+52 55 1234 5678`) side by side from `sm`. Same input classes as the survey form. Edit mode adds a read-only status line ("Active · change it from the user list").
- **`PasswordSection`** (`FormSection` 2):
  - create: "Create password" / "The user signs in with this password. Share it with them securely.";
  - edit: "Reset password" / "Set a new password for this user. Leave it empty to keep the current one.";
  - fields Password and Confirm password with `PasswordInput` (show / hide button with `EyeIcon` / `EyeOffIcon`, label "Show password" / "Hide password", `aria-pressed`), `autoComplete="new-password"`, rules hint under the first field;
  - password fields are cleared after a successful save.
- **`PermissionsSection`** (`FormSection` 3, "Permissions" / "Choose what this user can see and do.", badge "Coming soon"): the three roles (Owner, Admin, Member with one-line descriptions) as a muted, non-focusable preview with the user's role (or Member in create) marked; text "Permissions will be editable in a future version. New users join as Member."; wrapped in `aria-disabled`; nothing is sent with the form.
- `UserFormSkeleton` with the three cards.

### Messages

`userForm.*` (titles, subtitles, actions, sections details / password create / reset / permissions, fields, show / hide password, password rules, status hint, coming soon, errors `NOT_FOUND` / `EMAIL_TAKEN` / `VALIDATION` / `UNKNOWN`, toasts) and `validation.email`, `validation.phone`, `validation.passwordRules`, `validation.passwordMismatch` in en and es.

## Verification

- `yarn lint`, `tsc --noEmit`, `yarn build` (`/users/new` static, `/users/[id]` partial prerender).
- The survey form (create and edit) looks and behaves the same after moving the shared pieces.
- Create: required fields, invalid email, phone rules, password rules and mismatch, email already used (error on the field); success toast and redirect to the edit page; the user appears in the list as Active / Member.
- Edit: values loaded; empty password keeps the old one; a new password is validated and replaced (checked with the store's `verifyPassword`); changing the name updates the list, and the sidebar / greeting if it is the current user.
- Unsaved changes dialog on Back and `beforeunload` while dirty; no warning after saving.
- Unknown or other organization's id → 404.
- Permissions card shows "Coming soon", is not focusable, and nothing from it is submitted.
- Passwords and hashes never appear in the HTML, RSC payload, toasts or logs.
- 375, 768, 1280px; light / dark; English / Spanish; keyboard (first invalid field focused, password toggles, dialogs).

## References

- @docs/users.md
- @context/features/users-phase-1-list-spec.md
- @src/components/surveys/form/
- @src/lib/surveys/schema.ts
- @src/actions/surveys.ts
- @src/lib/users/service.ts
