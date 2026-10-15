# Top Bar Phase 2 — Survey Form Spec

## Overview

Phase 2 of 3 of the contextual top bar: the survey create and edit pages use the bar as their header.

- `/surveys/new`: the bar says "Create survey" with the subtitle, and "New survey" is replaced by the submit button "Create survey".
- `/surveys/[id]`: the bar says "Edit survey" with the subtitle, with a Delete icon button and "Save changes".
- `FormHeader` is no longer used by the survey form.

Requires phase 1 (`AppTopBar`, `PageHeading`, `AppShellProvider`). Full research in `docs/contextual-top-bar.md` (sections 2 and 3).

## Decisions (from the research)

- **The bar lives inside the `<form>`**: the submit button is a real `type="submit"` with the form's pending state; Enter in a field still submits. No `form="…"` attribute, no global state.
- **Back** is an icon button before the title (unsaved changes dialog as today).
- **Delete** (edit only) is a destructive icon button with a tooltip next to Save.
- **Create title** becomes "Create survey" / "Crear encuesta" (same text as the submit button).
- **The edit fallback shows the same bar** (static title, submit disabled) while the survey loads.

## Requirements

### SurveyForm

- `SurveyForm` renders, inside its `<form>`:

```tsx
<AppTopBar
  heading={<PageHeading back={{ onClick: goBack }} title={t(config.titleKey)} subtitle={t(config.subtitleKey)} />}
  actions={<>
    {config.showDelete && meta && <DeleteIconButton label={t("actions.deleteSurvey")} onClick={() => setDeleteOpen(true)} />}
    <SubmitButton pending={isPending} label={t(`actions.${config.submitKey}`)} pendingLabel={tForm("actions.saving")} />
  </>}
/>
<div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-10 flex flex-col gap-8">{…sections}</div>
```

- `FormHeader` is no longer rendered by `SurveyForm`; the first card starts under the bar.
- The `<form>` spans the main column (no `max-w`); the page files drop their `max-w` wrapper (it moves inside the form, under the bar).

### Shared action buttons (`src/components/layout/top-bar-actions.tsx`)

- `SubmitButton`: primary, `type="submit"`, `CheckIcon` / spinner, label visible from `@md` of the bar and `aria-label` + tooltip below; disabled and "Saving…" while pending; styled like the current primary button (`h-11 rounded-full`, primary shadow).
- `DeleteIconButton`: `variant="outline"`, destructive text and border, `Trash2Icon`, `size-11 rounded-full`, `aria-label` + tooltip.

### Pages and loading

- `/surveys/new`: renders `SurveyForm` only (the form renders the bar); the page stays static.
- `/surveys/[id]`: the Suspense fallback is `SurveyFormSkeleton`, which now renders `AppTopBar` with the static "Edit survey" heading and a disabled `SubmitButton`, then the card skeletons (no header skeleton).

### Messages

- `surveyForm.createTitle`: "Create survey" / "Crear encuesta".
- New `surveyForm.actions.deleteSurvey`: "Delete survey" / "Eliminar encuesta".

## Verification

- `yarn lint`, `tsc --noEmit`, `yarn build` (`/surveys/new` static, `/surveys/[id]` partial prerender).
- Create: bar shows back arrow, "Create survey", subtitle and the "Create survey" button (no "New survey"); Enter submits; invalid fields still show errors and focus; success redirects to the edit page, where the bar shows "Edit survey".
- Edit: bar shows Delete icon and "Save changes"; save shows the pending state and the toast; Delete opens its dialog; Back with unsaved changes opens the unsaved dialog.
- While the edit page loads, the bar is already there with the same title (no flicker).
- One `h1` per page; icon buttons named; 375 / 768 / 1024 / 1280 with the sidebar open and collapsed; light / dark; English / Spanish; no overflow.

## References

- @docs/contextual-top-bar.md
- @context/features/top-bar-phase-1-lists-spec.md
- @src/components/surveys/form/SurveyForm.tsx
- @src/components/surveys/form/SurveyFormSkeleton.tsx
- @src/components/form/FormHeader.tsx
- @src/app/(app)/surveys/new/page.tsx
- @src/app/(app)/surveys/[id]/page.tsx
