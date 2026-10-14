# Surveys Table

## Output

`docs/surveys-table.md`

## Research

Document how to build the survey list at `/surveys` as a table, from `table-design-view.png`, and how to remove "History" from the sidebar.

Scope rules from the request:

- **Copy only the content of the table**: the heading above it, the search and filters toolbar, the columns, the rows and the pagination. Ignore everything else in the screenshot:
  - its sidebar (logo, "Overview", user card);
  - its top bar (date, title, "New survey" button).
  - The current app shell (`AppSidebar`, `TopBar` with `NewSurveyButton`) stays as it is.
- **Sidebar**: the only change is removing the "History" item. "Surveys" becomes enabled and links to `/surveys`.
- **Status**: only **Draft** and **Active**. There is no "Paused".
- **Row checkboxes**: much lighter than in the screenshot. The near-black filled squares stand out too much and look bad.

The result must be detailed enough to split the work into phased feature specs.

## Include

Current state:

- **Routes:**
  - `/dashboard`, `/surveys/new` and `/surveys/[id]` exist in the `(app)` route group;
  - `/surveys` does not exist (404).
- **Sidebar** (`src/components/layout/NavMain.tsx`, `NAV_GROUPS`):
  - Dashboard (enabled), Surveys (disabled, "Coming soon"), History (disabled), Settings (disabled);
  - the `nav.history` messages in en/es;
  - `NavKey` includes `"history"`.
- **Data:**
  - `Survey` in `src/types/survey.ts`: `code`, `name`, `category`, `isActive`, `deletedAt`, `createdAt`, `updatedAt`. There is no status enum and no color.
  - The in-memory store `src/lib/surveys/service.ts`: `getSurvey`, `listActiveSurveys`, `countActiveSurveys`, `hasResponses`, create / update / soft delete, the 5-active limit (`ACTIVE_LIMIT`).
  - Responses come from the mock in `src/lib/mock-data.ts`.
- **Reusable dashboard pieces:**
  - `CollectionsToolbar`: search and date range in the URL, debounced;
  - `src/lib/date-range.ts`: `RANGE_KEYS`, `parseRange`, `getDateRange`;
  - `src/lib/format.ts`;
  - category labels and colors from the dashboard cards;
  - `EmptyState`, `DashboardSkeleton`, `CopyButton`.
- **Not installed yet:** the shadcn `table`, `checkbox` and `pagination` components (and possibly `popover`).
- **Platform:**
  - next-intl with the language in `localStorage`: the server renders English, so translated text lives in Client Components, and `react/jsx-no-literals` applies;
  - `cacheComponents: true`: `searchParams` must be read inside `<Suspense>`.
- **Brand tokens:** pink primary, `--accent`, `--card-border`, `--success`; `scripts/check-contrast.mjs` runs in `yarn lint`.
- **Overview references to History** (`context/project-overview.md`):
  - the `/history` route and `history/page.tsx` in the structure;
  - the "History list with search and pagination" checklist item.
  - Decide whether the surveys table replaces that item.

Screen description, from `table-design-view.png` (table content only):

- **Heading:**
  - "All surveys" with a muted count ("6");
  - the subtitle "Manage your surveys and keep track of every response.";
  - a "Last 30 days" date range select on the right.
- **Card** (white, rounded, `card-border`):
  - **Toolbar**: "Search surveys" input on the left; "Type" (filter icon) and "Date" (calendar icon) outline buttons on the right.
  - **Header row**: select-all checkbox; uppercase, spaced, muted column labels "SURVEY", "TYPE", "STATUS", "RESPONSES", "LAST UPDATED"; an unlabeled actions column.
  - **Rows:**
    - checkbox;
    - colored dot + survey name (bold) + code below (monospace, muted, uppercase);
    - type badge (pink tint: "Satisfaction", "Rating", "Poll");
    - status pill with a dot (green "Active", grey "Draft"; "Paused" in amber is not used);
    - responses (bold, thousands separator, "—" when there are none);
    - last updated ("Today, 10:24 am", "Yesterday, 4:18 pm", "12 Oct 2024, 9:42 am");
    - a "…" row menu.
  - **Row states:** hover tint (light pink) and row dividers.
  - **Footer:** "Showing 1–6 of 6 surveys" and pagination (previous, pages with the current one filled pink, next).

What to define:

- **Status:**
  - Map `isActive` to Active / Draft with no new field.
  - Pill colors with tokens:
    - Active: `success` tint;
    - Draft: `muted`.
  - Check the contrast pairs and add any new one to `check-contrast.mjs`.
  - Say whether a status filter is needed besides "Type".
- **Checkboxes:**
  - Use the shadcn `Checkbox` restyled to be light:
    - unchecked: thin `--card-border` / `--input` border, card background, no fill;
    - checked: primary;
    - indeterminate state for select-all.
  - Show the before / after classes and confirm the focus ring and 3:1 for the border (or why the border is decorative).
  - Decide what selection is for (bulk activate / deactivate / delete, respecting the 5-active limit and confirmation dialogs) or whether to drop the checkboxes until bulk actions exist. Make a recommendation.
- **Dot color:** `Survey` has no color.
  - Options: one color per category from the dashboard palette, a deterministic color from the id, or no dot.
  - Recommend one and keep it accessible: decorative, the meaning is never in the color alone.
- **Columns and data:**
  - Responses per survey (total, or within the selected date range).
  - "Last updated" formatting with `useFormatter`: relative "Today / Yesterday" + time, then a date, in `en-US` / `es-MX`, from `MOCK_NOW`, with no `new Date()` on the server.
  - Sort order: `updatedAt` desc. Say whether columns can be sorted.
- **Filters and URL state:**
  - search by name / code;
  - Type (category) multi-select;
  - Date: range on `updatedAt` or `createdAt`.
  - How the heading's "Last 30 days" select relates to the "Date" button: they are the same filter shown twice in the screenshot, so propose one.
  - Query params and their parsing, reusing `CollectionsToolbar` / `date-range.ts` where possible.
  - Page size and `?page=`.
  - Server-side filtering in `src/lib/surveys` (a `listSurveys({ query, categories, range, page })` with the shape of the future `GET /api/v1/surveys`).
- **Row actions ("…"):** Edit (`/surveys/[id]`), copy link, copy code, activate / deactivate (respecting the limit), delete (with confirmation). Reuse the existing Server Actions and error codes.
  - The whole row or the name links to edit, with keyboard access.
- **Empty and loading states:**
  - no surveys at all, with a "Create survey" call to action;
  - no results for the filters, with "Clear filters";
  - a `loading.tsx` skeleton with the table shape.
- **Responsive:**
  - At 500px a wide table does not fit: horizontal scroll inside the card vs. a stacked card list below `md`. Recommend one.
  - Check 375, 768 and 1280px with no page overflow.
- **Accessibility:**
  - a real `<table>` with `<th scope="col">` and a caption or `aria-label`;
  - checkbox labels ("Select In-store experience", "Select all");
  - the row menu trigger label;
  - pagination `nav` with `aria-current`;
  - the announced status text.
- **i18n:** every new string in en/es (`surveys.table.*`), plurals for counts ("Showing {from}–{to} of {total} surveys"), with no literals in JSX.
- **Sidebar change:**
  - remove the History item and its `nav.history` keys (`NavKey`, messages, and the message parity check);
  - enable Surveys;
  - active state on `/surveys` and its children (`/surveys/new`, `/surveys/[id]`): which item is highlighted there.
  - Update `project-overview.md` (routes, structure, checklist).
- **Dashboard links:** whether the dashboard should link to `/surveys` ("View all").
- **Dark mode:** row hover, badges, the status pills and the light checkboxes on plum surfaces.

Verification:

- `yarn lint` (contrast and messages), `tsc` and `yarn build`, with the route table showing `/surveys`.
- Screenshots at 375, 768 and 1280px, light and dark, English and Spanish, compared with `table-design-view.png`.
- Keyboard: tab through toolbar → select all → rows → menus → pagination.
- Filters survive a reload (URL).
- The 5-active limit is respected from the row menu.

Recommendation:

- the data source and the query function;
- whether to use TanStack Table or plain shadcn `Table` with server-side filtering;
- what the checkboxes do;
- the dot color;
- the responsive strategy;
- the phases to split into specs (for example: sidebar + route + read-only table; filters + pagination; row actions + selection; polish).

## Sources

- @context/screenshots/table-design-view.png
- @context/project-overview.md
- @context/coding-standars.md
- @src/components/layout/NavMain.tsx
- @src/types/survey.ts
- @src/lib/surveys/service.ts
- @src/lib/mock-data.ts
- @src/lib/dashboard.ts
- @src/lib/date-range.ts
- @src/components/dashboard/CollectionsToolbar.tsx
- @docs/dashboard.md
- @docs/survey-form.md
- shadcn/ui `table`, `checkbox`, `pagination` docs (context7)
