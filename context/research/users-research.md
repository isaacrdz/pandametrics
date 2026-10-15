# Users

## Output

`docs/users.md`

## Research

Document how to build user management and the user's own profile:

1. **User list** at `/users`, based on the survey table (`/surveys`): same heading, toolbar, table / stacked list, pagination, empty and loading states. The only new column is the **profile picture** (avatar image, or the initials when there is no image). Row actions: only **Edit** and **Deactivate**.
2. **Create and edit user** at `/users/new` and `/users/[id]`, one shared form (like `SurveyForm`), designed like the survey form: numbered cards with a header and subheader.
   - Card 01: name, email, phone.
   - Card 02: create password (create mode) or reset password (edit mode).
   - Card 03: permissions, shown as "Coming soon".
3. **My profile**: clicking the user in the sidebar opens the menu, and above "Dark mode / Light mode" there is a new "My profile" item. The profile page shows a form like edit user, without permissions, in a two-column grid (6 / 6): the form on the right, and on the left a card to change the profile picture, disabled and clearly marked as coming soon.

The result must be detailed enough to split the work into phased feature specs.

## Include

Current state:

- `User` type (`src/types/survey.ts`): `id`, `name`, `email`, `image`, `role`, `organizationId`, dates. No phone, no status, no password.
- `MOCK_USERS` (2 users), `MOCK_CURRENT_USER`, `getAppContext()`; `getUser` in the survey service.
- Survey table pieces: `SurveysTableSection`, `SurveysToolbar`, `SurveysTable`, `SurveysList`, `SurveysPagination`, `SurveysTableSkeleton`, `SurveyRowParts`, `list.ts`, `list-params.ts`, `useUrlSearch`.
- Survey form pieces: `SurveyForm`, `FORM_MODES`, `FormSection`, `SurveyFormHeader`, `RequiredMark`, `useValidationMessage`, `useBeforeUnloadWarning`, `UnsavedChangesDialog`, `SurveyFormSkeleton`, Server Actions with error codes.
- `NavUser` dropdown (theme toggle only), `NavMain` groups, `getInitials`, shadcn `Avatar`.
- Overview Prisma `User` model.

What to define:

- Data: new fields (phone, status, password hash), validation rules, uniqueness, mock store and service API with the future Prisma shape; overview schema update.
- List: columns, avatar cell, filters (search, status), URL params, actions menu, deactivate rules (self, last owner), confirmation, empty / loading states, responsive.
- Form: modes, cards and fields, password rules per mode, permissions card, header actions, server actions and errors.
- Profile: menu item, route, layout grid and order on mobile, password change rules, avatar card, what refreshes after saving.
- Sidebar entry, shared components to move, i18n keys, accessibility, phases.

## Sources

- @src/types/survey.ts
- @src/lib/mock-data.ts
- @src/lib/surveys/service.ts
- @src/lib/surveys/list.ts
- @src/lib/surveys/list-params.ts
- @src/actions/surveys.ts
- @src/components/surveys/table/
- @src/components/surveys/form/
- @src/components/surveys/SurveyActionsMenu.tsx
- @src/components/layout/NavUser.tsx
- @src/components/layout/NavMain.tsx
- @src/app/(app)/surveys/
- @context/project-overview.md
- @docs/surveys-table.md
- @docs/survey-form.md
