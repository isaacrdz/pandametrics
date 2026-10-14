# Surveys Table Polish Spec

## Overview

Phase 4 of 4 of the surveys table work: the final pass on `/surveys`.

- responsive at every width;
- dark mode;
- keyboard and screen reader;
- loading states;
- a comparison against `table-design-view.png`.

No new features. Fix whatever the pass finds. Requires phases 1–3. Full research in `docs/surveys-table.md` (sections 9, 10, 12, 14).

## Requirements

### Responsive

| Width | Expected |
| ----- | -------- |
| 375, 500 | Stacked list. Search full width, Type and Status below it. Selection bar wraps without overflow. Pager centered. |
| 768 | Table without the Type column (type badge under the name). Toolbar on one row. |
| 1280 | Full table as in the screenshot. |

- No page-level horizontal overflow at any width. The table wrapper `overflow-x-auto` is only a safety net.
- Long survey names truncate with `truncate` and a `title`, in both the table and the list. Codes never wrap.
- Only one layout is in the accessibility tree at a time (`hidden` / `md:hidden`).

### Dark mode

Check every element on plum surfaces against `docs/surveys-table.md` section 12:

- card, borders and row dividers;
- row hover;
- type badges, Active and Draft pills;
- light checkboxes (`--control-border`) and checked state;
- current page, menus and dialogs;
- dots.

Re-run `check-contrast.mjs`, and add any new pair the pass finds.

### Accessibility

- Landmarks and names:
  - the table `caption`;
  - `th scope="col"`, and `th scope="row"` on the name;
  - the pagination `nav` label.
- Every interactive element has a visible solid `--ring`.
- Tab order: range → search → Type → Status → (selection bar) → select all → per row (checkbox, name, menu) → pager.
- Live regions:
  - the "Showing …" text after filtering;
  - "{count} selected" while selecting.
  - Neither one is too chatty: no announcement on every keystroke, because the search is debounced.
- Status and type are never conveyed by color alone (pill text, badge text; decorative dots `aria-hidden`).
- No console warnings from Radix (missing `Description` / `Title`) in the menus and dialogs.

### Loading and transitions

- The skeleton matches the final layout at every width (list skeleton below `md`), so the page does not shift.
- Filter and page changes keep the previous content until the new one streams in. There is no flash of the empty state.

### Comparison with the reference

Compare screenshots with `table-design-view.png`, ignoring the screenshot's sidebar and top bar, and confirm the intended differences:

- no "Paused" status;
- no toolbar "Date" button;
- no fake page 2;
- light checkboxes.

Spacing, type scale, uppercase headers and row height should match.

## Verification

- `yarn lint`, `tsc`, `yarn build` (`◐ /surveys`)
- Screenshots at 375, 500, 768 and 1280px, light and dark, English and Spanish, with data and in both empty states (no surveys, no results)
- A keyboard-only walkthrough: filter, select, bulk action, row menu action, page change
- No horizontal scroll, no console errors or warnings

## References

- @docs/surveys-table.md
- @context/features/surveys-table-base-spec.md
- @context/features/surveys-table-filters-spec.md
- @context/features/surveys-table-actions-spec.md
- @context/screenshots/table-design-view.png
