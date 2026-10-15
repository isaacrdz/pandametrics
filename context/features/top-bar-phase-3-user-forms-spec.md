# Top Bar Phase 3 — User Forms and Profile Spec

## Overview

Phase 3 of 3 of the contextual top bar: the user create and edit pages and My profile use the bar as their header, and `FormHeader` is deleted.

- `/users/new`: "Create user" + subtitle, submit "Create user".
- `/users/[id]`: "Edit user" + subtitle, submit "Save changes".
- `/profile`: "My profile" + subtitle, submit "Save changes".

Requires phases 1 and 2 (`AppTopBar`, `PageHeading`, `SubmitButton`). Full research in `docs/contextual-top-bar.md`.

## Decisions (from the research)

- Same pattern as the survey form: the bar inside the `<form>`, back icon before the title, the submit button as the primary action.
- No Delete in user forms (users are deactivated or deleted from the list).
- **Create title** becomes "Create user" / "Crear usuario".
- The profile keeps its 4 / 8 grid under the bar.

## Requirements

### UserForm

- Renders `AppTopBar` inside its `<form>`: `PageHeading` (back → `config.backHref` with the unsaved changes dialog, title and subtitle from the mode config) and `SubmitButton` (pending state from the form).
- The content (cards, or the profile grid with the picture card) goes under the bar inside a `max-w` container: `max-w-5xl` for create / edit, `max-w-6xl` for the profile. The page files drop their own `max-w` wrapper.
- `FormHeader` is no longer used anywhere: delete `src/components/form/FormHeader.tsx`.

### Pages and loading

- `/users/new` and `/profile` stay static.
- `/users/[id]`: `UserFormSkeleton` renders `AppTopBar` with the static "Edit user" heading and a disabled `SubmitButton`, then the card skeletons.

### Messages

- `userForm.createTitle`: "Create user" / "Crear usuario".

### Overview

- Check that `context/project-overview.md` (section 9, "Top bar as the page header") matches what was built in the three phases.

## Verification

- `yarn lint`, `tsc --noEmit`, `yarn build` (same route kinds as before).
- Create user: bar shows back arrow, "Create user", subtitle and "Create user"; validation, email taken and success redirect still work; after creating, the bar shows "Edit user".
- Edit user: "Edit user" with "Save changes"; pending state and toast; Back with unsaved changes opens the dialog.
- Profile: "My profile" with "Save changes"; wrong current password still lands on its field; the 4 / 8 grid sits under the bar.
- No "New survey" button on any form; the bar does not flicker while `/users/[id]` loads.
- One `h1` per page; 375 / 768 / 1024 / 1280 with the sidebar open and collapsed; light / dark; English / Spanish; no overflow.

## References

- @docs/contextual-top-bar.md
- @context/features/top-bar-phase-1-lists-spec.md
- @context/features/top-bar-phase-2-survey-form-spec.md
- @src/components/users/form/UserForm.tsx
- @src/components/users/form/UserFormSkeleton.tsx
- @src/components/form/FormHeader.tsx
- @src/app/(app)/users/
- @src/app/(app)/profile/page.tsx
