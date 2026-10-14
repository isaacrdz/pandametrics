# Surveys Table Filters Spec

## Overview

Phase 2 of 4 of the surveys table work. Add search, the Type and Status filters, and pagination to `/surveys`, all kept in the URL and applied on the server.

Requires phase 1 (`/surveys`, `list.ts`, the table and the list). Full research in `docs/surveys-table.md` (sections 4, 7, 9, 10, 11).

## Decisions (from the research)

- **Every filter lives in the URL**: `q`, `type`, `status`, `range`, `page`. Only non-default values are written; reloads and shared links restore the view.
- **Server-side**: `listSurveys` filters, sorts and paginates; the client only renders `SurveyRow[]`
- **Status filter** (All / Active / Draft) besides Type: the table is the only place drafts are visible
- **Page size 10**; the pager only shows pages that exist and is hidden when there is one page (the screenshot's fake page 2 is not reproduced)
- **No "Date" button**: the range stays in the heading (phase 1)

## Requirements

### Query params and parsing

| Param | Values | Default |
| ----- | ------ | ------- |
| `q` | text (name or code, accent and case insensitive via `normalizeSearch`) | `""` |
| `type` | comma list of `satisfaction`, `rating`, `poll` | all |
| `status` | `active` \| `draft` | all |
| `range` | `RANGE_KEYS` | `30d` |
| `page` | 1-based integer | 1 |

- **`src/lib/surveys/list-params.ts`:**
  - `parseSurveyListParams(searchParams)`: unknown values fall back to defaults; categories are de-duplicated;
  - `buildSurveysHref(params)`: writes only non-default values; any filter change drops `page`.
- **`listSurveys(organizationId, params)`:**
  - takes `query`, `categories`, `status`, `range`, `page` and `pageSize`;
  - returns `total` (after filters), `totalAll`, `page` (clamped to `pageCount`) and `pageCount`.
  - This is the shape of the future `GET /api/v1/surveys`.

### Toolbar (`SurveysToolbar`, client, inside the card)

- **Search:**
  - input with an icon, "Search surveys", `type="search"`;
  - 300 ms debounce;
  - syncs when the URL changes from outside.
  - Extract this logic from `CollectionsToolbar` into a shared `useUrlSearch` hook and use it in both places, so the dashboard behavior does not change.
- **Type:**
  - an outline button with a sliders icon that opens a `DropdownMenu` with `DropdownMenuCheckboxItem` per category;
  - the label shows the count when filtered ("Type · 2"), with an `aria-label` for the full state.
- **Status:** an outline button + `DropdownMenuRadioGroup` (All / Active / Draft).
- **Layout:**
  - below `md`: search full width, Type and Status side by side below it;
  - from `md`: search on the left (~45%), filters on the right.

### Pagination (`SurveysPagination`)

- **Footer text:** "Showing {from}–{to} of {total} surveys". It is an ICU plural with formatted numbers, sits in a polite live region, and is hidden when `total` is 0.
- **Pager:**
  - previous / next icon buttons ("Previous page" / "Next page"), `aria-disabled` at the ends;
  - one `Link` per page, with an ellipsis after 7 pages;
  - the current page is `bg-primary text-primary-foreground` with `aria-current="page"`.
  - The pager is wrapped in `<nav aria-label="Pagination">`.
- Links work without JS and keep the other params.

### No-results state

- `totalAll > 0 && total === 0`: `EmptyState` with `SearchIcon`, "No surveys match your filters" and "Clear filters".
- "Clear filters" is a `Link` to `/surveys`, keeping `range` when it is not the default.
- The toolbar stays visible.

### Messages

From `docs/surveys-table.md` section 11, in en/es:

- `toolbar.search`, `toolbar.type`, `toolbar.typeLabel`, `toolbar.status`, `toolbar.statusAll`;
- `pagination.*`;
- `noResults.*`.

## Verification

- `yarn lint`, `tsc`, `yarn build`
- **URL:** `/surveys?q=store&type=satisfaction&status=active&range=7d` shows the same result after a reload.
- **Search:**
  - accents and case are ignored ("PRUEBAS" finds "Pruebas con QR");
  - typing debounces;
  - "Clear filters" resets everything but `range`.
- **Paging:** with more than 10 surveys (create drafts in the form):
  - page 2 works;
  - a filter change goes back to page 1;
  - `?page=99` clamps to the last page.
- **Dashboard:** search still works there after the hook extraction.
- **Accessibility:** keyboard opens and closes both menus, and the "Showing …" text is announced after filtering.
- 375, 768, 1280px; light, dark, English, Spanish; no console errors.

## References

- @docs/surveys-table.md
- @context/features/surveys-table-base-spec.md
- @src/components/dashboard/CollectionsToolbar.tsx
- @src/lib/surveys/list.ts
- @src/lib/format.ts
- @src/components/ui/dropdown-menu.tsx
