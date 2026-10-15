# Users Phase 3 — My Profile Spec

## Overview

Phase 3 of 3 of user management: the signed-in user's own profile.

- A **"My profile"** item in the sidebar user menu, above the theme toggle.
- `/profile` with the user form in a new `profile` mode: details and change password, **no permissions**.
- A 6 / 6 grid: the form on the right, a **profile picture** card on the left, disabled and marked "Coming soon".

Requires phases 1 and 2. Full research in `docs/users.md` (section 5).

## Decisions (from the research)

- **Same form, third mode**: `profile` is added to `USER_FORM_MODES`; no second form component.
- **Only the current user** is edited: the id comes from the session (mock), never from the client.
- **Changing the password asks for the current one**.
- **No role, status or permissions** in the profile: a user cannot change their own access.
- **Picture upload is not built**: the card shows the avatar and a disabled "Change photo" button.
- **Grid 6 / 6** as requested (a 5 / 7 split would give the form more room; noted, not applied).

## Requirements

### Entry point (`NavUser`)

- Dropdown order: label "Account", separator, **My profile** (`UserRoundIcon`, `DropdownMenuItem asChild` + `Link` to `/profile`), Dark mode / Light mode.
- No sidebar nav item; no item is highlighted on `/profile`.
- On the user list, the current user's "Edit" links to `/profile`, and `/users/[id]` with the current user's id redirects to `/profile`.

### Service and action

- `updateProfile(scope, input)` in `src/lib/users/service.ts`: same rules as `updateUser` on `scope.userId`; when a new password is sent, `currentPassword` must match (`verifyPassword`) or it fails with `WRONG_PASSWORD`. Email uniqueness (`EMAIL_TAKEN`).
- `updateProfile(values)` in `src/actions/users.ts` → `{ values }`; revalidates `/users` and the layout (sidebar name, greeting, "created by").

### Form mode `profile`

| | `profile` |
| --- | --- |
| Title / subtitle | "My profile" / "Update your personal details and password." |
| Submit | "Save changes" |
| Cards | 01 Details, 02 Change password; **no** 03 Permissions |
| Password card | "Change password" / "Leave it empty to keep your current password."; fields Current password (`autoComplete="current-password"`), New password, Confirm password; all optional, but if any is filled all are required and validated |
| Status line | Hidden (a user cannot deactivate themselves) |
| After save | Toast "Profile updated", reset with returned values (password fields empty), layout refreshed |
| Back / discard | `/dashboard` |

`WRONG_PASSWORD` is shown on the Current password field; `EMAIL_TAKEN` on Email.

### Page (`src/app/(app)/profile/page.tsx`)

- Metadata "My profile · Panda Metrics"; data from the mock session (`getAppContext()`), passed as plain values (no `passwordHash`).
- Width `max-w-6xl`. The `<form>` wraps the header and the grid, so Save stays at the top as in the other forms.
- Header spans the full width; below it `grid gap-8 lg:grid-cols-12`:
  - left `lg:col-span-6`: `ProfilePictureCard`, `lg:sticky lg:top-24`;
  - right `lg:col-span-6`: cards 01 and 02.
- Below `lg` the columns stack: the picture card first, compact (avatar 96px next to the text), then the form.

### Profile picture card (`src/components/users/ProfilePictureCard.tsx`)

- Card with the same border and radius as `FormSection`.
- Title "Profile picture" with a **"Coming soon"** badge; text "You'll be able to upload a photo here. For now we show your initials."
- `UserAvatar` 128px (image or initials), then name, email and role badge.
- "Change photo" button (`ImageUpIcon`, outline) with `aria-disabled`, not clickable, muted, and a tooltip "Coming soon" (visible text already says it).
- Not part of the form submission.

### Messages

`userMenu.profile` ("My profile" / "Mi perfil"); `profile.*` (title, subtitle, picture title / description / change, toasts.updated); `userForm.sections.password.change.*`, `userForm.fields.currentPassword`, `userForm.errors.WRONG_PASSWORD` in en and es.

## Verification

- `yarn lint`, `tsc --noEmit`, `yarn build` (`/profile` in the route table).
- Menu: "My profile" above the theme toggle, opens `/profile`; keyboard and screen reader names correct.
- Layout: at 1280 the picture card is on the left and the form on the right, 6 / 6, the card stays in view while scrolling; at 768 and 375 they stack with the picture card first; no overflow with the sidebar open and collapsed.
- Saving name, email or phone updates the sidebar user, the greeting and the user list; no permissions or status shown.
- Password: empty keeps it; wrong current password → error on that field; correct one replaces it; mismatch and rules validated.
- Email already used → error on the field.
- "Change photo" is disabled, says "Coming soon", and does nothing on click or Enter.
- Current user's "Edit" in the list and `/users/<own id>` lead to `/profile`.
- Light / dark; English / Spanish; unsaved changes dialog and `beforeunload`.

## References

- @docs/users.md
- @context/features/users-phase-1-list-spec.md
- @context/features/users-phase-2-form-spec.md
- @src/components/layout/NavUser.tsx
- @src/components/users/form/
- @src/actions/users.ts
- @src/lib/users/service.ts
