# Surveys Table Base Spec

## Overview

Phase 1 of 4 of the surveys table work. Create `/surveys` with a read-only table of every survey of the organization, active and draft, and clean up the sidebar.

- Remove "History" from the sidebar and enable "Surveys".
- Build the page from the table content of `table-design-view.png`, without filters, pagination, row actions or checkboxes, which come in later phases.

Full research in `docs/surveys-table.md` (sections 1–4, 6, 7, 9, 11, 13).

## Decisions (from the research)

- **Copy only the table content.** The screenshot's sidebar and top bar are ignored, and the current `AppSidebar` and `TopBar` (with "New survey") stay as they are.
- **Status:** `isActive: true` → **Active**, `false` → **Draft**. No new field, and no "Paused".
- **One date control:** the range select in the heading (`RANGE_KEYS`, default `30d`) sets the window of the Responses column. It does not filter rows, and the toolbar "Date" button is not built.
- **Dot color:** stable per survey, `hash(id) % 6` over `--chart-1` … `--chart-5` + `--brand`. Decorative (`aria-hidden`).
- **Sort:** `updatedAt` desc, then `name`. No sortable columns.
- **No checkbox column** until phase 3 (bulk actions).
- **Plain shadcn `Table`**, no TanStack Table. Data is shaped on the server.
- **History is replaced by the table:** remove it from the sidebar and the messages, and update the overview.

## Requirements

### Sidebar

- `NavMain.tsx`:
  - remove the History item and `"history"` from `NavKey`;
  - Surveys becomes `enabled: true` (`/surveys`);
  - drop the unused `ChartColumnIcon` import.
- Remove `nav.history` from `en.json` and `es.json`.
- Surveys is highlighted on `/surveys`, `/surveys/new` and `/surveys/[id]` (existing `startsWith`).

### Data

- `service.ts`: add `listSurveys(organizationId)`, which returns every visible survey (not deleted, active and draft).
- `mock-data.ts`: add `countMockResponses(surveyId, range)`.
- `src/lib/surveys/list.ts` (server): `listSurveys(organizationId, { range })` returns `{ rows: SurveyRow[], totalAll, activeCount, now }`.
  - `SurveyRow` is plain data: `id`, `code`, `name`, `category`, `isActive`, `responses` (in range), `updatedAt` (ISO), `publicUrl`, `colorIndex`.
  - `now` is `MOCK_NOW` (ISO), with no server clock.
  - Shape it so phase 2 can add `query`, `categories`, `status`, `page` and `pageSize` without changing the result type.
- Move `matchesQuery` out of `dashboard.ts` into `src/lib/surveys/search.ts` (used by the dashboard now, by the table in phase 2).

### Route

- `src/app/(app)/surveys/page.tsx`:
  - a Server Component;
  - `metadata.title` "Surveys";
  - a `<Suspense fallback={<SurveysTableSkeleton />}>` around a component that awaits `searchParams` (`range` via `parseRange`) and calls `listSurveys`.
- `src/app/(app)/surveys/loading.tsx` uses the same skeleton.
- `yarn build` lists `/surveys` as `◐`.

### Components (`src/components/surveys/table/`)

- **`SurveysTableSection` (client):**
  - heading "All surveys" + muted count + subtitle;
  - the range `Select` on the right, which writes `?range=` (omitted when default) with `router.replace(…, { scroll: false })`;
  - the card (`rounded-3xl border-card-border bg-card`) holding the table / list.
- **`SurveysTable` (from `md`):**
  - `<caption className="sr-only">`;
  - `<th scope="col">` headers, muted, uppercase, wide tracking;
  - columns Survey, Type (hidden at `md – lg`, shown under the name instead), Status, Responses, Last updated;
  - row dividers `border-card-border`, hover `bg-accent/40`.
  - The name cell is `<th scope="row">`.
- **`SurveysList` (below `md`):** a `<ul>`. Each item has dot + name + code, then type badge, status pill and responses, then "Updated …".
- **Shared pieces:**
  - `SurveyDot`;
  - `SurveyStatusPill`:
    - Active: `bg-success/10 text-success-foreground` with a `bg-success` dot, 4.74:1 / 8.0:1, measured values in a comment;
    - Draft: `bg-muted text-muted-foreground`.
  - the type badge `bg-accent text-primary` with `categories.X.title`.
- **Survey cell:**
  - the name is a `Link` to `/surveys/[id]` (semibold, solid focus ring);
  - the code is below it (`font-mono text-xs tracking-wider text-muted-foreground`).
- **Responses:**
  - `format.number`, `tabular-nums`, right aligned;
  - "—" with `aria-label` "No responses" for 0;
  - the header has an sr-only range suffix.
- **Last updated:**
  - `getDayOffset(date, now, TIME_ZONE)` in `src/lib/format.ts` (locale-independent);
  - "Today, {time}" / "Yesterday, {time}", otherwise `format.dateTime` (day, short month, year, time);
  - wrapped in `<time dateTime>`.
- **`SurveysTableSkeleton`:** heading + 6 skeleton rows with the column widths.
- **Empty state** (`totalAll === 0`): `EmptyState` with "No surveys yet", a description and a "Create survey" link to `/surveys/new`.

### Dashboard

- Add a "View all" text link to `/surveys` next to the surveys heading (`dashboard.surveys.viewAll`). Nothing else on the dashboard changes.

### Messages

- The new `surveys` namespace in en/es, from `docs/surveys-table.md` section 11. For this phase:
  - `title`, `subtitle`, `caption`, `toolbar.range`;
  - `columns.*` and `columns.responsesRange`;
  - `status.*`, `noResponses`, `updated.*`;
  - `empty.*`.
- Plus `dashboard.surveys.viewAll`.
- Reuse `categories.X.title` and `dateRange.<key>`.

### Overview

- `context/project-overview.md`:
  - remove History from the navigation concept, the route tree and the project structure;
  - change "History list with search and pagination" to "Survey table with search, filters and pagination";
  - drop "history list" from phase 2.

## Verification

- `yarn lint` (message parity without `nav.history`, contrast), `tsc`, `yarn build` (`◐ /surveys`)
- `/surveys` shows the 5 seeded surveys:
  - 4 Active and "Pruebas con QR" as Draft;
  - newest update first;
  - responses change with the range select, and the range survives a reload.
- A survey created or edited in the form appears at the top after saving. A deleted one disappears.
- Sidebar: no History; Surveys highlighted on `/surveys`, `/surveys/new` and `/surveys/[id]`.
- 375, 768 and 1280px with no page overflow (list below `md`, table without Type at 768, full table at 1280); light, dark, English, Spanish; no console errors.

## References

- @docs/surveys-table.md
- @context/screenshots/table-design-view.png
- @src/components/layout/NavMain.tsx
- @src/lib/surveys/service.ts
- @src/lib/dashboard.ts
- @src/lib/mock-data.ts
- @src/lib/date-range.ts
- @src/components/dashboard/CollectionsToolbar.tsx
- @src/components/dashboard/EmptyState.tsx
