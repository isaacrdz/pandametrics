# Users

User management for the organization (list, create, edit, deactivate) and the signed-in user's own profile.

## 1. Current state

| Piece | Today |
| --- | --- |
| `User` type (`src/types/survey.ts`) | `id`, `name`, `email`, `image`, `role` (`OWNER` / `ADMIN` / `MEMBER`), `organizationId`, `createdAt`, `updatedAt`. No phone, no status, no password |
| Mock data (`src/lib/mock-data.ts`) | `MOCK_USERS` with 2 users of Acme (Jordan Davis, owner; Ana López, admin), both without image. `MOCK_CURRENT_USER` is Jordan |
| Access | `getAppContext()` (mock session); `getUser(id)` lives in the survey service, only for "created by" |
| Survey table | `/surveys`: `SurveysTableSection` (heading + range, toolbar, card, live regions), `SurveysToolbar` (debounced search, Type and Status menus), `SurveysTable` (from `@2xl`) / `SurveysList` (stacked), `SurveysPagination` (5 / 10 / 25 / 50), `SurveysTableSkeleton`, `SurveyRowParts`, server-side filtering in `list.ts` with URL state in `list-params.ts`, `useUrlSearch` |
| Survey form | `/surveys/new` and `/surveys/[id]` share `SurveyForm`; `FORM_MODES` is the only place that knows create vs. edit. `FormSection` (numbered card: `01` tile, title, description), `SurveyFormHeader` (title, subtitle, Back, Delete, Save), `RequiredMark`, `useValidationMessage`, `useBeforeUnloadWarning`, `UnsavedChangesDialog`, `SurveyFormSkeleton`. Server Actions return error codes that the client translates |
| User menu | `NavUser`: avatar + name + email; the dropdown only has "Dark mode / Light mode" |
| Navigation | `NavMain`: Workspace (Dashboard, Surveys), Manage (Settings, disabled "Coming soon") |
| Overview schema | Prisma `User`: `name`, `email @unique`, `emailVerified`, `image`, `passwordHash`, `role`, `organizationId` |

## 2. Data

### New fields

| Field | Type | Rules |
| --- | --- | --- |
| `phone` | `string \| null` | Optional. Stored normalized as typed digits with an optional leading `+` (spaces, dashes and parentheses removed). 7 to 15 digits (E.164 length). No country picker in this version |
| `isActive` | `boolean` | Default `true`. Inactive users stay in the list (filterable) and, once Auth.js exists, cannot sign in |
| `passwordHash` | `string \| null` | Server only. Never part of the `User` sent to the client |

The table and the forms get plain view models (`UserRow`, form values) so `passwordHash` can never leak into a Client Component.

Overview (`context/project-overview.md`) Prisma `User` gains:

```prisma
phone    String?
isActive Boolean @default(true)

@@index([organizationId, isActive])
```

### Validation (Zod, shared by client and server)

| Field | Rule | Message key |
| --- | --- | --- |
| `name` | trimmed, 1–80 chars | `validation.required`, `validation.max` |
| `email` | trimmed, lowercased, valid email, ≤ 254 chars, unique | `validation.email`, `userForm.errors.EMAIL_TAKEN` |
| `phone` | optional; 7–15 digits after normalizing | `validation.phone` |
| `password` | 8–72 chars (72 is the bcrypt limit, kept for the future), at least one letter and one number | `validation.passwordRules` |
| `confirmPassword` | equals `password` | `validation.passwordMismatch` |
| `currentPassword` (profile only) | required when changing the password; checked on the server | `profile.errors.WRONG_PASSWORD` |

Emails are unique across the app (the overview schema has `email @unique`), so the check is global, not per organization. The server is the authority; the client only shows the `EMAIL_TAKEN` error it returns on the field.

### Store and service

`src/lib/users/service.ts`, an in-memory store on `globalThis` like the survey store, with the functions the Prisma service will have:

| Function | Notes |
| --- | --- |
| `listUsers(organizationId)` | Every user of the organization |
| `getUser(organizationId, id)` | `null` for another organization's id (pages answer 404) |
| `createUser(scope, input)` | Hashes the password, `isActive: true`, `role: MEMBER` (permissions are not editable yet) |
| `updateUser(scope, id, input)` | Name, email, phone; a new password only if one was sent |
| `setUserActive(scope, id, isActive)` | Rules below |
| `updateProfile(scope, input)` | Same as `updateUser` on `scope.userId`, plus the current password check |

- Passwords are hashed with `node:crypto` `scrypt` (random 16-byte salt, stored as `salt:hash`) and compared with `timingSafeEqual`. When Auth.js arrives, the hashing helper can switch to argon2 / bcrypt without touching the forms.
- Error codes: `NOT_FOUND`, `EMAIL_TAKEN`, `SELF_DEACTIVATE`, `LAST_OWNER`, `WRONG_PASSWORD`, plus `VALIDATION` / `UNKNOWN` from the actions.
- `getUser` in the survey service ("created by") reads from the user store, so a renamed user shows the new name in the share panel.
- Mock seed grows to about 8 users of Acme (owner, admins, members, 2 inactive, a few with phone, 2 with an `image` URL) so the list, filters and pagination have something to show.

### Deactivation rules

- A user cannot deactivate themselves (`SELF_DEACTIVATE`): the menu item is disabled on their own row with a hint, and the server rejects it anyway.
- The organization must keep at least one active `OWNER` (`LAST_OWNER`).
- Deactivating keeps everything the user created (surveys keep `createdById`); nothing is deleted.
- Reactivating is the same item on an inactive row ("Activate"), so the action can be undone. If the team wants deactivation to be one-way from the list, the item can be hidden for inactive rows instead.

## 3. User list (`/users`)

### Layout

Same structure as `/surveys` (`SurveysTableSection`), with these differences:

| Area | Surveys | Users |
| --- | --- | --- |
| Heading | "All surveys" + count, subtitle, **date range** select on the right | "Users" + count, subtitle ("Manage who has access to your organization."), **"New user"** button on the right (primary, `PlusIcon`, links to `/users/new`) |
| Toolbar | Search + Type + Status | Search (name, email, phone; accent and case insensitive) + **Status** (All / Active / Inactive). No Type menu |
| Selection | Checkboxes + bulk bar | Same: checkboxes (own row disabled) and a bulk bar with **Activate**, **Deactivate** and **Delete** (soft delete, `deletedAt`). Updated after the research: the user asked for them |
| Rows per page | 5 / 10 / 25 / 50, `?size=` | Same |
| Sort | `updatedAt` desc | Name asc (people are looked up by name), then email |

URL params: `q`, `status` (`active` / `inactive`), `page`, `size`, parsed and built in `src/lib/users/list-params.ts` with the same helpers as `list-params.ts` (`withFilters`, `getPageItems` can be shared).

### Columns

| Column | Content | Notes |
| --- | --- | --- |
| *(avatar)* | `UserAvatar` 36px: `AvatarImage` when `image` is set, otherwise `AvatarFallback` with `getInitials(name)` on `bg-accent text-accent-foreground` (same as `NavUser`) | **The new column.** Decorative (`alt=""`), the name next to it is the label. If the image fails to load, Radix falls back to the initials |
| User | Name (link to `/users/[id]`, bold, truncated with `title`) and email below (muted, truncated) | Row header (`<th scope="row">`), like the survey name |
| Role | Badge "Owner" / "Admin" / "Member" (`bg-accent text-primary`, like the type badge) | Read only; hidden below `@4xl` and moved under the name, like Type |
| Status | Pill "Active" (success) / "Inactive" (muted) | Same pill as surveys with the user labels |
| Phone | Formatted as stored, `tabular-nums`; "—" with an sr-only "No phone" when empty | Hidden below `@3xl` (it is the least important column) |
| Last updated | Today / Yesterday / date, same `SurveyUpdatedAt` logic | |
| Actions | "…" menu | See below |

Below the `@2xl` container width the card shows a stacked list (like `SurveysList`): avatar + name + email + menu on the first line, role badge, status pill and phone on the second.

The current user's row shows a small "You" badge next to the name.

### Row actions

`UserActionsMenu` ("…", `aria-label` "Actions for {name}"), same trigger and menu styles as `SurveyActionsMenu`:

1. **Edit** (`PencilIcon`, link to `/users/[id]`; on the current user's row it links to `/profile`)
2. separator
3. **Deactivate…** (`UserXIcon`, destructive tone) on active rows / **Activate** (`UserCheckIcon`) on inactive rows

Deactivate opens a confirmation (`AlertDialog`): "Deactivate {name}? They will lose access to Panda Metrics. Their surveys and responses are kept. You can activate them again later." with "Cancel" and "Deactivate". Activate needs no confirmation. Success toasts: "User deactivated" / "User activated" with the name as description; errors map the codes above.

Disabled states: on the current user's own row the item is disabled with a hint label ("You can't deactivate yourself"); the last active owner gets the server error.

### States

- **Empty organization** cannot happen (the current user is always listed), so there is only the **no results** state ("No matching users", "Clear filters").
- `loading.tsx` / Suspense fallback: `UsersTableSkeleton` (same shape as the survey skeleton with a round avatar block).
- Transitions dim the card with `aria-busy`, and the live regions ("Showing 1–5 of 8 users") stay mounted, as in the survey table.

### Reuse

The survey table pieces are survey-specific (they import `SurveyRow`). Instead of copying them:

- Move the generic parts to `src/components/table/`: pagination (`TablePagination`, parameterized by `buildHref`), the toolbar search input, the status filter menu, the status pill, the updated-at cell, the skeleton rows and the live-region pattern.
- Keep `SurveysTable` / `UsersTable` as the column definitions.

This is the only refactor in the list phase, and `/surveys` must look and behave the same afterwards.

## 4. Create and edit user (`/users/new`, `/users/[id]`)

### One form, modes in one place

`UserForm` with `USER_FORM_MODES` (same pattern as `FORM_MODES`):

| | `create` | `edit` | `profile` |
| --- | --- | --- | --- |
| Title / subtitle | "New user" / "Add a person to your organization." | "Edit user" / "Update the user's details and access." | "My profile" / "Update your personal details and password." |
| Submit | "Create user" | "Save changes" | "Save changes" |
| Card 01 Details | Yes | Yes | Yes |
| Card 02 Password | "Create password", required | "Reset password", optional | "Change password", optional, asks the current password |
| Card 03 Permissions | Yes ("Coming soon") | Yes ("Coming soon") | No |
| After saving | Toast "User created", go to `/users/[id]` | Toast "Changes saved", reset the form | Toast "Profile updated", reset the form, refresh the layout (name in the sidebar and greeting) |
| Back | `/users` | `/users` | `/dashboard` |

Shared with the survey form: move `FormSection`, `RequiredMark`, the form header, `useBeforeUnloadWarning`, `useValidationMessage` and `UnsavedChangesDialog` from `src/components/surveys/form/` to `src/components/form/`, so both forms import the same pieces. The header takes its labels as props (today it reads `surveyForm.actions`).

Page width: `max-w-5xl`, like the survey form.

### Card 01 — Details

`FormSection` number 1, "User details" / "Name and contact information.":

- **Name** (required, `autoComplete="name"`)
- **Email** (required, `type="email"`, `autoComplete="email"`, server error `EMAIL_TAKEN` shown on the field)
- **Phone** (optional, `type="tel"`, `inputMode="tel"`, `autoComplete="tel"`, placeholder `+52 55 1234 5678`)

Name full width; email and phone side by side from `sm` (`grid sm:grid-cols-2`). Same input classes as the survey form (`h-12 rounded-xl bg-muted/60`).

Edit mode also shows the status as read-only text with a link-style hint ("Active · change it from the user list"), so the form never has a second way to deactivate.

### Card 02 — Password

`FormSection` number 2. Fields: **Password** and **Confirm password**, each with a show / hide toggle button (`EyeIcon` / `EyeOffIcon`, `aria-pressed`, label "Show password"), `autoComplete="new-password"`, and a rules hint under the first field ("At least 8 characters, with a letter and a number").

- **Create**: "Create password" / "The user signs in with this password. Share it with them securely." Both fields required.
- **Edit**: "Reset password" / "Set a new password for this user. Leave it empty to keep the current one." Both optional; if one is filled, both are required and validated. The current password is never shown or sent to the client.
- **Profile**: "Change password" / "Leave it empty to keep your current password." Adds **Current password** first (`autoComplete="current-password"`); the server checks it (`WRONG_PASSWORD` on that field).

No "send reset link" option: there is no email service yet. It can be added to this card when one exists.

Password values are cleared from the form after a successful save, and never logged.

### Card 03 — Permissions (coming soon)

`FormSection` number 3, "Permissions" / "Choose what this user can see and do." with a **"Coming soon"** badge next to the title (needs an optional `badge` prop on `FormSection`).

Content: a muted preview of the future control (the three roles as disabled radio cards: Owner, Admin, Member with one-line descriptions, the user's current role shown as selected), wrapped in `aria-disabled` with the text "Permissions will be editable in a future version. New users join as Member." Nothing in it is focusable or sent with the form.

### Header actions

Back (outline) and Submit, as in the survey form. No Delete button: users are deactivated or deleted (soft delete) from the list.

### Server Actions (`src/actions/users.ts`)

| Action | Input | Result |
| --- | --- | --- |
| `createUser(values)` | form values | `{ id }` |
| `updateUser(id, values)` | form values | `{ values }` (normalized, password fields empty) |
| `setUserActive(id, isActive)` | | `null` |
| `updateProfile(values)` | profile values | `{ values }` |

Same `ActionResult` shape and error codes as the survey actions (codes, never text). Every action revalidates `/users`; `updateUser` and `updateProfile` also revalidate the layout (`revalidatePath("/", "layout")`), because the sidebar and the greeting show the current user's name, and `/surveys/[id]` shows "created by".

Pages read `params` inside Suspense (Cache Components), and an unknown id or another organization's id answers `notFound()`.

## 5. My profile (`/profile`)

### Entry point

`NavUser` dropdown, in this order:

1. Label "Account" (as today)
2. separator
3. **My profile** (`UserRoundIcon`, `DropdownMenuItem asChild` with a `Link` to `/profile`) — new
4. Dark mode / Light mode (as today)

No sidebar nav item: the profile is reached from the user menu only. The Users item (section 6) does not highlight on `/profile`.

### Layout

```
max-w-6xl
┌───────────────────────────── header: My profile · subtitle · Back · Save ─────────────────────────────┐
├──────────────── lg:col-span-6 ────────────────┬──────────────── lg:col-span-6 ────────────────────────┤
│  Profile picture card (sticky top-24)         │  01 Details  (name, email, phone)                      │
│   ┌──────┐                                    │                                                        │
│   │  JD  │  128px avatar / initials           │  02 Change password (current, new, confirm)            │
│   └──────┘                                    │                                                        │
│   Jordan Davis · jordan@acme.co · Owner       │                                                        │
│   [ Change photo ] (disabled)  Coming soon    │                                                        │
└───────────────────────────────────────────────┴────────────────────────────────────────────────────────┘
```

- `grid gap-8 lg:grid-cols-12`, picture card `lg:col-span-6`, form `lg:col-span-6`: the 6 / 6 split requested, picture on the left, form on the right.
- The header (title, subtitle, Back, Save) spans both columns, so Save is at the top as in the other forms; the form element wraps the whole grid.
- Below `lg` the columns stack with the picture card first and compact (avatar 96px, row layout), then the form.
- The picture card is `lg:sticky lg:top-24` so it stays in view next to the longer form.

Update: implemented as **4 / 8** after comparing 5 / 7 and 4 / 8 in the browser (the form keeps its fields in pairs and the page is shorter), with the columns driven by a container query (from 56rem of content) instead of `lg`.

### Profile picture card (coming soon)

- Title "Profile picture" with a **"Coming soon"** badge; text "You'll be able to upload a photo here. For now we show your initials."
- Large `UserAvatar` (image or initials), name, email and role badge under it.
- "Change photo" button (`ImageUpIcon`) **disabled** with `aria-disabled` and a tooltip "Coming soon"; "Remove photo" is not shown.
- When uploads exist, this card uses the S3 presigned upload from the overview (`/api/v1/uploads/image`) and writes `User.image`.

### Rules

- Edits only the current user (`scope.userId` from the mock session, never an id from the client).
- No permissions card, no status: a user cannot change their own role or deactivate themselves.
- Changing the email checks uniqueness. When Auth.js arrives, changing the email or password should also end the other sessions; noted for later.
- After saving, the sidebar (`NavUser`) and the greeting show the new name.

## 6. Navigation

- `NavMain`, group **Manage**: add **Users** (`UsersIcon`, `/users`, enabled) above Settings. It is active on `/users`, `/users/new` and `/users/[id]`.
- New `NavKey` `"users"` and `nav.users` messages.
- Role-based visibility (only owners and admins see Users) waits for permissions; until then everyone sees it.

## 7. i18n

New namespaces (en / es), with the same key structure as `surveys` and `surveyForm`:

| Namespace | Keys (examples) |
| --- | --- |
| `nav` | `users`: "Users" / "Usuarios" |
| `userMenu` | `profile`: "My profile" / "Mi perfil" |
| `users` | `title`, `subtitle`, `new`, `caption`, `columns.*` (`user`, `role`, `status`, `phone`, `updated`, `actions`), `status.ACTIVE` / `INACTIVE` ("Active" / "Activo", "Inactive" / "Inactivo"), `roles.OWNER` / `ADMIN` / `MEMBER`, `you`, `noPhone`, `toolbar.search`, `filters.status.*`, `pagination.showing` ("Showing {from}–{to} of {total, plural, one {# user} other {# users}}"), `noResults.*`, `actions.*` (`label`, `edit`, `deactivate`: "Deactivate…" / "Desactivar…", `activate`: "Activate" / "Activar", `selfHint`), `deactivate.*` (dialog), `toasts.*` |
| `userForm` | `createTitle`, `editTitle`, subtitles, `actions.*`, `sections.details.*`, `sections.password.create.*` / `reset.*` / `change.*`, `sections.permissions.*`, `fields.*` (`name`, `email`, `phone`, `password`, `confirmPassword`, `currentPassword`, `showPassword`, `hidePassword`), `passwordRules`, `statusHint`, `comingSoon`, `errors.*` (`NOT_FOUND`, `EMAIL_TAKEN`, `SELF_DEACTIVATE`, `LAST_OWNER`, `WRONG_PASSWORD`, `VALIDATION`, `UNKNOWN`), `toasts.*` |
| `profile` | `title`, `subtitle`, `picture.title`, `picture.description`, `picture.change`, `toasts.updated` |
| `validation` | `email`, `phone`, `passwordRules`, `passwordMismatch` |

"Desactivar" is used instead of "Pasar a inactivo" in the menu because it is shorter and reads as an action; the status pill says "Inactivo". Use "Pasar a inactivo" if the team prefers the original wording.

## 8. Accessibility

- Avatars are decorative next to the visible name; the stacked list keeps the same reading order as the table.
- Disabled "coming soon" controls use `aria-disabled` (not `disabled`) where they need a tooltip, and the "Coming soon" text is visible, not only in a tooltip.
- Password toggles have a label and `aria-pressed`; errors are linked with `aria-describedby`; the first invalid field gets focus on submit (react-hook-form).
- The deactivate dialog traps focus and returns it to the row menu trigger.
- Contrast: the new badges and pills reuse token pairs already in `check-contrast.mjs`.

## 9. Files

| Action | Files |
| --- | --- |
| New | `src/types/user.ts` (or extend `survey.ts`), `src/lib/users/{service,list,list-params,schema,password}.ts`, `src/actions/users.ts`, `src/app/(app)/users/{page,loading}.tsx`, `src/app/(app)/users/new/page.tsx`, `src/app/(app)/users/[id]/page.tsx`, `src/app/(app)/profile/page.tsx`, `src/components/users/table/*` (`UsersTableSection`, `UsersToolbar`, `UsersTable`, `UsersList`, `UserRowParts`, `UserActionsMenu`, `DeactivateUserDialog`, `UsersTableSkeleton`), `src/components/users/form/*` (`UserForm`, `user-form-modes.ts`, `UserDetailsSection`, `PasswordSection`, `PermissionsSection`, `PasswordInput`), `src/components/users/{UserAvatar,ProfilePictureCard}.tsx` |
| Move (no behavior change) | `FormSection`, `RequiredMark`, form header, form hooks, `UnsavedChangesDialog` → `src/components/form/`; generic table parts → `src/components/table/` |
| Change | `src/lib/mock-data.ts` (users seed), survey service `getUser`, `NavMain` (Users item), `NavUser` (My profile item), messages en / es, `context/project-overview.md` (routes, `User` fields, checklist) |

## 10. Verification

- `yarn lint` (messages parity, contrast, `jsx-no-literals`), `tsc --noEmit`, `yarn build` (new routes as partial prerenders).
- `/surveys` and the survey form look and behave the same after moving the shared pieces.
- List: avatar image and initials fallback (including a broken image URL); search by name, email and phone; status filter; pagination and `?size=`; the "You" badge; stacked list on narrow cards; no overflow at 375 / 768 / 1280 with the sidebar open and collapsed.
- Deactivate: confirmation, toast, row turns Inactive; Activate brings it back; own row disabled; last owner rejected; `/users` and the table refresh.
- Create: required password, rules, mismatch, email taken, redirect to edit. Edit: empty password keeps the old one; filled password is validated and replaced.
- Profile: menu item above the theme toggle; 6 / 6 grid on `lg`, stacked below; current password required to change it, wrong one rejected on the field; the sidebar name and greeting update after saving; picture button disabled with "Coming soon".
- Unknown or other organization's id → 404. `passwordHash` never appears in the HTML or the RSC payload.
- Keyboard and screen reader pass on the menu, dialog, password toggles and coming-soon controls; light / dark, English / Spanish.

## 11. Recommendation

Three phases:

1. **Users data and list**: types and mock seed, user store and service, `/users` list (avatar column, search, status filter, pagination, Edit link, Deactivate / Activate with confirmation and rules), Users nav item, shared table parts moved.
2. **User form**: shared form pieces moved, `UserForm` with `create` / `edit` modes, the three cards (details, password, permissions coming soon), actions and pages.
3. **My profile**: `NavUser` item, `/profile` with the `profile` mode (no permissions, current password), the 6 / 6 grid with the disabled picture card, layout refresh after saving.

Decisions to confirm before the specs:

- ~~No checkboxes or bulk actions~~ — changed: the list has checkboxes and bulk Activate / Deactivate / Delete (soft delete). See `context/features/users-phase-1-list-spec.md`.
- The Deactivate item becomes "Activate" on inactive rows, so deactivation can be undone.
- Permissions card shows the current role as a disabled preview; new users are created as Member.
- ~~Profile grid stays 6 / 6~~ — changed to 4 / 8.
