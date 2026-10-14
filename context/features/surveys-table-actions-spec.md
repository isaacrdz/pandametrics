# Surveys Table Actions Spec

## Overview

Phase 3 of 4 of the surveys table work:

- the "…" menu on each row;
- row selection with **light checkboxes**;
- bulk actions.

Every action respects the 5-active limit and keeps the user on `/surveys`. Requires phases 1 and 2. Full research in `docs/surveys-table.md` (sections 5, 8, 10, 11, 12).

## Decisions (from the research)

- **Checkboxes much lighter than the screenshot** (no near-black filled squares), yet visible at 3:1 (WCAG 1.4.11):
  - a new `--control-border` token: `#a08089` light, `#8a6b75` dark;
  - card background;
  - primary fill only when checked.
  - The shared `checkbox.tsx` keeps the shadcn defaults: the table passes its classes.
- **Selection has a purpose:** activate, move to draft or delete. Selection is client state, limited to the current page, and resets when filters or the page change.
- **New `setSurveyActive`** service function + Server Action; `updateSurvey` is not reused (it needs the whole form and re-merges questions).
- **The server is the authority on the limit:** the menu shows "N of 5 active" as a hint, and the action returns `ACTIVE_LIMIT`.
- **No clickable `<tr>`:** the name link and the menu are the row's interactive elements.

## Requirements

### Tokens and contrast

- `globals.css`: `--control-border` in `:root` (`#a08089`) and `.dark` (`#8a6b75`), plus `--color-control-border` in `@theme`.
- `check-contrast.mjs`: `["control-border", "card", UI, …]` and `["control-border", "background", UI, …]`.

### Checkbox

- Install the shadcn `checkbox` (`radix-nova`), with the lucide `CheckIcon` and a `MinusIcon` for indeterminate.
- Table classes:
  - `size-4.5 rounded-[5px] border-control-border bg-card shadow-none dark:bg-card`;
  - `data-checked:border-primary data-checked:bg-primary`;
  - indeterminate state styled like checked;
  - focus `ring-2 ring-ring ring-offset-2 ring-offset-card`;
  - the registry's enlarged hit area is kept.
- **Checkbox column:**
  - `w-12`, with header text "Select" in sr-only;
  - each row's box is labeled "Select {name}";
  - the header box is labeled "Select all surveys on this page" and goes indeterminate when only some rows are selected;
  - the same checkbox goes on each item of the mobile list.

### Selection bar

- With 1+ rows selected, the toolbar's right side shows:
  - "{count} selected" in a polite live region;
  - **Activate**;
  - **Move to draft**;
  - **Delete** (destructive);
  - **Clear selection**.
- New service function `setSurveysActive(scope, ids, isActive)` and a matching action:
  - **all or nothing**: activating checks `active + selected drafts ≤ 5` and returns `ACTIVE_LIMIT` otherwise;
  - ids from another organization or already deleted → `NOT_FOUND`, and nothing changes.
- **Bulk delete:**
  - an `AlertDialog`: "Delete {count} surveys? Their responses are kept.";
  - soft delete through a `deleteSurveys(ids)` action.

### Row menu (`SurveyRowMenu`)

- The trigger is a ghost icon button (`MoreHorizontalIcon`) with `aria-label` "Actions for {name}", and the menu opens with `align="end"`.
- **Items:**
  - Edit (`Link`);
  - Copy link (`getPublicSurveyUrl`) and Copy code, each with its success toast;
  - Activate / Move to draft (`setSurveyActive`), with the hint "{count} of {limit} active" from `activeCount`;
  - a separator;
  - Delete… (destructive), which opens `DeleteSurveyDialog`.
- **Errors** are toasts with `surveyForm.errors.*` (`ACTIVE_LIMIT` with `{ limit: 5 }`). Success shows `surveys.toasts.activated` / `deactivated`.

### Actions and revalidation

- `src/actions/surveys.ts`:
  - new `setSurveyActive`, `setSurveysActive` and `deleteSurveys`, with the same `ActionResult` / `toErrorResult`;
  - every survey action (including the existing `createSurvey`, `updateSurvey` and `deleteSurvey`) revalidates both `/dashboard` and `/surveys`.
- The table calls `refresh()` after a successful action, so the current URL re-renders. The server clamps `page` if the last page empties.
- `DeleteSurveyDialog`: a new optional `onDeleted` prop.
  - The default keeps today's `router.push("/dashboard")` for the form page.
  - The table passes a callback that stays on `/surveys`.

### Messages

From `docs/surveys-table.md` section 11, in en/es:

- `columns.select`, `select.*`;
- `actions.*`;
- `toasts.*`;
- `bulk.*`, including the plural delete confirmation.

## Verification

- `yarn lint` (contrast includes `control-border`), `tsc`, `yarn build`
- **Checkboxes:**
  - light grey-pink outline at rest in both themes, pink when checked;
  - select all goes indeterminate with partial selection;
  - a solid focus ring;
  - compare with the screenshot: no dark squares.
- **Limit:**
  - with 5 active, "Activate" on a draft (row or bulk) shows the `ACTIVE_LIMIT` toast and changes nothing;
  - after "Move to draft" on one survey, activating works;
  - the dashboard reflects every change.
- **Delete:**
  - single delete from the menu and bulk delete remove the rows, stay on `/surveys` and show the toast;
  - deleting from the form page still goes to `/dashboard`.
- **Selection** clears when a filter or the page changes.
- **Keyboard:**
  - Tab reaches checkbox → name → menu per row;
  - the menu works with arrows, Enter and Escape, and focus returns to the trigger;
  - the dialogs trap focus.
- 375, 768, 1280px; light, dark, English, Spanish; no console errors.

## References

- @docs/surveys-table.md
- @context/features/surveys-table-filters-spec.md
- @src/actions/surveys.ts
- @src/lib/surveys/service.ts
- @src/components/surveys/form/DeleteSurveyDialog.tsx
- @src/app/globals.css
- @scripts/check-contrast.mjs
