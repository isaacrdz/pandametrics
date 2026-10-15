# Users Phase 1 — Data and List Spec

## Overview

Phase 1 of 3 of user management:

- user data (new fields, mock seed, in-memory store and service);
- the user list at `/users`, based on the survey table, with a profile picture column;
- row actions: Edit and Deactivate / Activate;
- row selection with checkboxes and bulk actions: Activate, Deactivate and Delete;
- the Users item in the sidebar.

Phase 2 adds the create / edit form and phase 3 the user's own profile. Until phase 2, "New user" and "Edit" link to routes that do not exist yet (404). Full research in `docs/users.md` (sections 2, 3 and 6).

## Decisions (from the research)

- **Checkboxes and a bulk bar**, like the survey table: Activate, Deactivate and Delete on the selected rows. The row menu keeps only Edit and Deactivate / Activate.
- **Deactivate can be undone**: on inactive rows the item is "Activate".
- **Deactivate and Delete ask for confirmation**; Activate does not.
- **Delete is a soft delete** (`deletedAt`): the user disappears from the list and cannot sign in, but surveys keep their "created by". There is no restore in the UI.
- **A user cannot deactivate or delete themselves** (their row checkbox is disabled), and the organization always keeps one active owner.
- **Bulk actions are all or nothing**: if any selected user breaks a rule, nothing changes.
- **`passwordHash` never reaches the client**: the list works with a plain `UserRow`.
- **Generic table parts are shared** with the survey table instead of copied; `/surveys` must not change.

## Requirements

### Types and mock data

- `User` gains `phone: string | null`, `isActive: boolean` and `deletedAt: Date | null`. `passwordHash` lives only in the server store (`StoredUser = User & { passwordHash: string | null }`).
- `MOCK_USERS` grows to about 8 users of Acme: the current owner (Jordan), admins and members, 2 inactive, a few with phone, 2 with an `image` URL (one valid, one broken to show the fallback). Passwords seeded as hashes of a dev password.
- `context/project-overview.md`: Prisma `User` gains `phone String?`, `isActive Boolean @default(true)`, `deletedAt DateTime?` and `@@index([organizationId, isActive])`; routes add `/users`, `/users/new`, `/users/[id]`, `/profile`; checklist adds user management.

### Store and service (`src/lib/users/`)

- `service.ts` (`server-only`): in-memory store on `globalThis`, like the survey store. Functions: `listUsers(organizationId)` and `getUser(organizationId, id)` (both skip soft-deleted users), `setUserActive(scope, id, isActive)`, `setUsersActive(scope, ids, isActive)` and `softDeleteUsers(scope, ids)`. `createUser` / `updateUser` come in phase 2.
- `password.ts`: `hashPassword` / `verifyPassword` with `node:crypto` `scrypt` (random 16-byte salt, `salt:hash`, `timingSafeEqual`).
- Errors as codes: `NOT_FOUND`, `SELF_DEACTIVATE`, `LAST_OWNER` (class like `SurveyServiceError`).
- Rules, checked for every id before any change (all or nothing): other organization's or deleted id → `NOT_FOUND`; the current user among the ids when deactivating or deleting → `SELF_DEACTIVATE`; leaving the organization without an active `OWNER` → `LAST_OWNER`. The bulk functions return the number of users that changed.
- A soft-deleted user keeps their email reserved (emails are unique); noted for when Auth.js arrives.
- The survey service `getUser` ("created by" in the share panel) reads from the user store.

### List data (`src/lib/users/list.ts`, `list-params.ts`)

- `UserRow`: `id`, `name`, `email`, `phone`, `image`, `initials`, `role`, `isActive`, `isCurrentUser`, `updatedAt` (ISO string).
- `listUsers(organizationId, currentUserId, params)` → `{ rows, total, totalAll, page, pageCount, pageSize, now }`.
- Search on name, email and phone, accent and case insensitive (reuse `matchesQuery` logic); status filter `all` / `active` / `inactive`; sort by name asc, then email; pagination with clamping.
- URL params: `q`, `status`, `page`, `size` (5 / 10 / 25 / 50, default 5). `parseUserListParams`, `buildUsersHref`, `withFilters`.

### Shared table parts (`src/components/table/`)

Move out of `src/components/surveys/table/` without changing how `/surveys` looks or behaves:

- pagination (takes the page data and a `buildHref` / `onNavigate`), page items helper;
- light checkbox (`SurveyCheckbox`) and the selection bar (count, actions passed as props, clear button, DOM order matching the screen);
- toolbar search input (debounced, with `useUrlSearch`);
- status filter menu (generic options and labels);
- status pill (`tone: "success" | "muted"`, label);
- updated-at cell (Today / Yesterday / date);
- skeleton rows.

Survey-specific pieces (`SurveysTable`, `SurveysList`, row parts, the survey bulk actions) stay where they are and import the shared ones.

### Server Action (`src/actions/users.ts`)

- `setUserActive(id, isActive)`, `setUsersActive(ids, isActive)` → `{ count }` and `deleteUsers(ids)` → `{ count }`: validated input (Zod; 1 to `MAX_PAGE_SIZE` unique ids), mock session scope from `getAppContext()`, same `ActionResult` shape and codes as the survey actions; revalidate `/users` (and `/surveys/[id]` stays correct because "created by" still resolves).

### Page and components

- `src/app/(app)/users/page.tsx`: metadata "Users · Panda Metrics"; `searchParams` read inside Suspense; `loading.tsx` with `UsersTableSkeleton`.
- `UsersTableSection`: heading "Users" + muted count, subtitle "Manage who has access to your organization.", **"New user"** primary button (`PlusIcon`, `/users/new`) on the right; toolbar; card with table or stacked list; pagination; always-mounted live regions ("Showing {from}–{to} of {total} users"); `aria-busy` dimmed card during transitions; scroll to the card on page / size change.
- `UsersToolbar`: search (name, email, phone) + Status menu (All / Active / Inactive). No Type menu.
- Selection (like the survey table): per list view, reset when a filter or the page changes; header checkbox selects the page (indeterminate when partial); the current user's checkbox is disabled with the label "You can't select yourself".
- Selection bar (shared) in the toolbar with 1+ rows selected: "{count} selected" (live region), **Activate**, **Deactivate**, **Delete** (destructive), **Clear selection**. Activate runs directly; Deactivate and Delete open a confirmation.
- `UsersTable` (card from `@2xl`), columns:
  0. checkbox — `w-12`, labels "Select {name}" / "Select all users on this page";
  1. avatar — `UserAvatar` 36px: `AvatarImage` when `image` is set, `AvatarFallback` with the initials (`bg-accent text-accent-foreground`) otherwise or when the image fails; decorative;
  2. user — name link to `/users/[id]` (bold, truncated, `title`) with the email below; `<th scope="row">`; "You" badge on the current user's row;
  3. role — badge Owner / Admin / Member (`bg-accent text-primary`); below `@4xl` it moves under the name;
  4. status — pill Active (success) / Inactive (muted);
  5. phone — `tabular-nums`, "—" with sr-only "No phone" when empty; hidden below `@3xl`;
  6. last updated — shared updated-at cell;
  7. actions — `UserActionsMenu`.
- `UsersList` (stacked, below `@2xl`): checkbox + avatar + name + email + menu, then role, status and phone.
- `UserActionsMenu` ("…", label "Actions for {name}", same styles as `SurveyActionsMenu`):
  - **Edit** (`PencilIcon`) → `/users/[id]`;
  - separator;
  - **Deactivate…** (`UserXIcon`, destructive) on active rows → `DeactivateUserDialog`; **Activate** (`UserCheckIcon`) on inactive rows, no dialog;
  - on the current user's row the toggle is disabled (`aria-disabled`) with the hint "You can't deactivate yourself".
- `DeactivateUserDialog` (`AlertDialog`), one or many: "Deactivate {name}?" / "Deactivate {count} users?" — "They will lose access to Panda Metrics. Their surveys and responses are kept. You can activate them again later." / Cancel / Deactivate (destructive, pending state). Lives in the section (not in the row), like the survey delete dialog.
- `DeleteUsersDialog` (`AlertDialog`, bulk): "Delete {count, plural, one {# user} other {# users}}?" — "They will be removed from the list and lose access to Panda Metrics. Their surveys and responses are kept. This can't be undone from Panda Metrics." / Cancel / Delete (destructive, pending state).
- Toasts: "User deactivated" / "User activated" with the name; bulk "{count} users activated / deactivated / deleted"; errors map `NOT_FOUND`, `SELF_DEACTIVATE`, `LAST_OWNER`, `UNKNOWN`. Selection clears after a successful bulk action.
- No-results state: "No matching users" + "Clear filters".

### Navigation

- `NavMain`, group Manage: **Users** (`UsersIcon`, `/users`, enabled) above Settings; active on `/users` and its children. `NavKey` `"users"`, `nav.users`.

### Messages

`nav.users`; `users.*` (title, subtitle, new, caption, columns, select, status, roles, you, noPhone, toolbar, filters, pagination, noResults, actions, bulk, deactivate and delete dialogs, toasts, errors, with ICU plurals for counts) in en and es. Validation keys come in phase 2.

## Verification

- `yarn lint` (message parity, contrast, `jsx-no-literals`), `tsc --noEmit`, `yarn build` (`/users` as partial prerender).
- `/surveys` looks and behaves the same (table, list, filters, pagination, selection, actions) after moving the shared parts.
- Avatar: image when valid, initials when missing or broken.
- Search by name, email and phone (with and without accents); status filter; pagination and `?size=`; filters survive a reload; no-results and "Clear filters".
- Deactivate asks for confirmation and the row turns Inactive; Activate brings it back; own row disabled; deactivating the last active owner is rejected with its toast.
- Selection: header checkbox (all / indeterminate), own checkbox disabled, selection clears on filter or page change; bulk Activate / Deactivate / Delete with counts and toasts; a selection that would leave no active owner changes nothing; deleted users leave the list and their surveys still show "created by".
- "You" badge on the current user; Users nav item active on `/users`.
- `passwordHash` does not appear in the HTML or the RSC payload of `/users`.
- 375, 768, 1280px with the sidebar open and collapsed; light / dark; English / Spanish; keyboard through toolbar, select all, rows, menu, selection bar and dialogs; no overflow.

## References

- @docs/users.md
- @src/types/survey.ts
- @src/lib/mock-data.ts
- @src/lib/surveys/service.ts
- @src/lib/surveys/list.ts
- @src/lib/surveys/list-params.ts
- @src/actions/surveys.ts
- @src/components/surveys/table/
- @src/components/surveys/SurveyActionsMenu.tsx
- @src/components/layout/NavMain.tsx
- @context/project-overview.md
