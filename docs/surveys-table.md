# Surveys Table

How to build the survey list at `/surveys` as a table, from `context/screenshots/table-design-view.png`, and how to remove "History" from the sidebar.

Scope rules from the request:

- Copy **only the table content**: the heading, toolbar, columns, rows and pagination. The screenshot's sidebar and top bar are ignored, and the current app shell stays as it is.
- In the sidebar, **only "History" is removed**. "Surveys" becomes enabled.
- Status is **Draft or Active only**. There is no "Paused".
- The row checkboxes must be **much lighter** than the near-black squares in the screenshot.

## 1. Current state

### Routes and shell

- **The `(app)` route group** has these routes:
  - `/dashboard`;
  - `/surveys/new`;
  - `/surveys/[id]` (with `loading.tsx`).
  - **`/surveys` does not exist (404).**
- **App shell:** `AppSidebar` + `TopBar`. `TopBar` already has `NewSurveyButton` (→ `/surveys/new`), the language switcher and the user menu. The table page reuses it as is.
- **Sidebar** (`src/components/layout/NavMain.tsx`):
  - `NAV_GROUPS`:
    - workspace: Dashboard (enabled), Surveys (`enabled: false`, tooltip "Coming soon"), History (`enabled: false`);
    - manage: Settings (`enabled: false`).
  - `type NavKey = "dashboard" | "surveys" | "history" | "settings"`.
  - The active state is `pathname.startsWith(item.href)`. Once Surveys is enabled, it is highlighted on `/surveys`, `/surveys/new` and `/surveys/[id]` with no extra code.
  - Messages `nav.history` in `en.json` ("History") and `es.json` ("Historial").

### Data

- **`Survey`** (`src/types/survey.ts`): `id`, `organizationId`, `createdById`, `code`, `name`, `description`, `category` (`SATISFACTION | RATING | POLL`), `isActive`, `questions`, `deletedAt`, `createdAt`, `updatedAt`. There is **no status enum and no color**.
- **The store** (`src/lib/surveys/service.ts`, `server-only`, in memory on `globalThis`):
  - queries:
    - `getSurvey`;
    - `listActiveSurveys` (active only, insertion order);
    - `countActiveSurveys`;
    - `hasResponses`;
    - `getUser`.
  - mutations:
    - `createSurvey`;
    - `updateSurvey`;
    - `softDeleteSurvey`.
  - errors: `SurveyServiceError` with `NOT_FOUND | ACTIVE_LIMIT | CATEGORY_LOCKED`;
  - `assertActiveLimit` against `ACTIVE_SURVEY_LIMIT = 5`.
  - **There is no function to list every survey (active + draft) and no function to only toggle `isActive`.**
- **Seeded surveys** (`src/lib/mock-data.ts`, `MOCK_NOW = 2026-10-13T18:00Z`):
  - 4 active: STORE7 "In-store experience", EVENT2 "Event check-in", PROD91 "Product feedback", HELP44 "Support follow-up";
  - 1 inactive: 5XS1NK "Pruebas con QR".
  - `updatedAt = createdAt` for seeds.
  - Responses are static in `MOCK_RESPONSES`; `getMockSurveyMetrics(survey, range).totalResponses` counts them per range.
- **Server Actions** (`src/actions/surveys.ts`):
  - `createSurvey`, `updateSurvey`, `deleteSurvey`;
  - they return `ActionResult` with error codes;
  - they call `revalidatePath("/dashboard")` (not `/surveys`).
- **`DeleteSurveyDialog`** (`src/components/surveys/form/`) takes `surveyId`, `surveyName`, `open` and `onOpenChange`. On success it always runs `router.push("/dashboard")`.

### Reusable pieces

| Piece | Where | Reuse in the table |
| ----- | ----- | ------------------ |
| Search + range in the URL, debounced 300 ms, synced when the URL changes from outside | `CollectionsToolbar` | the pattern; the component itself only knows `q` and `range` |
| `RANGE_KEYS` (7d, 30d, 90d, month), `parseRange`, `getDateRange` | `src/lib/date-range.ts` | as is |
| `normalizeSearch` (accents, case) and `matchesQuery` (name or code) | `src/lib/format.ts`, `src/lib/dashboard.ts` | move `matchesQuery` next to the new list query |
| `getPublicSurveyUrl(code)` | `src/lib/dashboard.ts` | copy link |
| `CopyButton` | `src/components/dashboard/` | as the model for copy actions (it is an icon button; the menu needs menu items) |
| `EmptyState` | `src/components/dashboard/` | empty states |
| `categories.{SATISFACTION,RATING,POLL}.title` | messages | type badge |
| `results.active` / `inactive` | messages | a new `status` pair is cleaner (see 4) |
| `surveyForm.errors.*` (incl. `ACTIVE_LIMIT` with `{limit}`) | messages | error toasts |
| `DropdownMenu` (incl. `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`) | `src/components/ui/dropdown-menu.tsx` | row menu, Type and Status filters |
| `Select` | `src/components/ui/select.tsx` | range |
| `AlertDialog`, `Badge`, `Skeleton`, `Tooltip` | `src/components/ui/` | as is |

### Not installed yet

- shadcn `table` and `checkbox` (style `radix-nova`, `components.json`).
- `pagination` is not needed: the shadcn version is plain links and buttons, and the pager has 3 elements (see 7).
- No `popover` either: both filters fit in a `DropdownMenu`.

### Platform constraints

- **next-intl without URL routing:**
  - the server always renders English, so every translated string lives in Client Components;
  - `react/jsx-no-literals`;
  - `scripts/check-messages.mjs` checks en/es parity;
  - `TIME_ZONE = "America/Mexico_City"` in `src/i18n/config.ts`, passed to both the server config and `LocaleProvider`, so dates format the same on server and client.
- **`cacheComponents: true`:**
  - `searchParams` is runtime data and must be awaited inside `<Suspense>` (the dashboard does it in `DashboardContent`);
  - no `new Date()` on the server for "now": use `MOCK_NOW` until the database exists.
- **Tokens and contrast:**
  - tokens: `--primary`, `--accent`, `--card-border`, `--muted`, `--muted-foreground`, `--success`, `--success-foreground`, `--input`, `--ring`;
  - `scripts/check-contrast.mjs` runs in `yarn lint`.

### History references in the overview

`context/project-overview.md` mentions History in four places:

- the navigation concept (line ~602: Dashboard / Surveys / **History** / Settings);
- the route tree (`├── /history`);
- the project structure (`history/page.tsx`);
- Management checklist: "History list with search and pagination".

Phase 2 ("… 5-active limit, history list.") also names it.

**The survey table replaces the History list.** Both were "the list of every survey with search and pagination", and the responses of a survey are its history: they are already reachable from each survey. Update all four places, and change the checklist item to "Survey table with search, filters and pagination".

## 2. Screen description (table content only)

From `table-design-view.png`:

- **Heading:**
  - "All surveys" (bold, ~2rem) followed by a muted count "6";
  - subtitle "Manage your surveys and keep track of every response.";
  - on the right, a "Last 30 days" select with a calendar icon.
- **Card:** white, `rounded-3xl`, thin border, all the content below inside it.
- **Toolbar** (inside the card, top):
  - "Search surveys" input with a search icon (rounded, ~45% wide);
  - on the right, "Type" (sliders icon) and "Date" (calendar icon) outline buttons.
- **Header row:**
  - select-all checkbox;
  - muted labels, uppercase, wide tracking, ~0.75rem: "SURVEY", "TYPE", "STATUS", "RESPONSES", "LAST UPDATED";
  - an unlabeled actions column;
  - divider below.
- **Rows** (~95px tall, divider between rows):
  - checkbox;
  - **Survey:** colored dot (8px) + name (semibold) + code below (monospace, muted, small, uppercase, spaced);
  - **Type:** pink-tint badge ("Satisfaction", "Rating", "Poll");
  - **Status:** pill with a dot: green tint "Active", grey "Draft" (amber "Paused" is not used);
  - **Responses:** bold number with a thousands separator, or "—" when there are none;
  - **Last updated:** "Today, 10:24 am", "Yesterday, 4:18 pm", then "12 Oct 2024, 9:42 am";
  - "…" button at the end.
- **Row hover:** very light pink background (row 3 in the screenshot).
- **Footer** (inside the card, divider above): "Showing 1–6 of 6 surveys" on the left; pager on the right (‹, 1 filled pink, 2, ›).

### What the screenshot gets wrong

- **Paused:** not a Panda status.
- **Checkboxes:** near-black filled squares. They are the darkest element of the page and pull the eye away from the names.
- **The pager** shows page "2" while the footer says "1–6 of 6". The pager must only show pages that exist.
- **Date twice:** "Last 30 days" (heading) and "Date" (toolbar) are two controls for one concept (see 6).

## 3. Sidebar change

```ts
type NavKey = "dashboard" | "surveys" | "settings";

const NAV_GROUPS: NavGroup[] = [
  {
    key: "workspace",
    items: [
      { key: "dashboard", href: "/dashboard", icon: LayoutGridIcon, enabled: true },
      { key: "surveys", href: "/surveys", icon: ClipboardListIcon, enabled: true },
    ],
  },
  {
    key: "manage",
    items: [{ key: "settings", href: "/settings", icon: SlidersHorizontalIcon, enabled: false }],
  },
];
```

- Remove `nav.history` from `en.json` and `es.json` together, so the parity check still passes.
  - Drop the `ChartColumnIcon` import from `NavMain` (it is only used by History there).
- The **Surveys** item is active on `/surveys`, `/surveys/new` and `/surveys/[id]` (`startsWith`).
  - That is the right highlight: create and edit are part of survey management.
  - The pink active dot keeps working.
- `/surveys/[id]` is a dynamic route: `NavMain` already wraps `usePathname()` in `<Suspense>`, so nothing changes there.
- Nothing else in the sidebar changes: logo, organization switcher and user card stay.

## 4. Status: Draft and Active

- **Mapping:** `isActive: true` → **Active**, `isActive: false` → **Draft**. There is no new field and no data migration.
  - "Draft" is the right word for Panda: an inactive survey is one the public kiosk refuses (`/public/:code` only serves active surveys). It is being prepared or has been retired, and Panda does not need to tell those apart today.
  - Deleted surveys (`deletedAt`) never appear.
- **Messages:** add `surveys.status.ACTIVE` / `DRAFT`:
  - en: "Active" / "Draft";
  - es: "Activa" / "Borrador" ("encuesta" is feminine).
  - Keep `results.active` / `inactive` for the dashboard card, which says "Inactive".
- **Pill:**

  | Status | Classes | Light | Dark |
  | ------ | ------- | ----- | ---- |
  | Active | `bg-success/10 text-success-foreground`, dot `bg-success` | `#3d7a32` on `success/10` over card: **4.74:1** | `#86d672` on `success/10` over `#261b20`: **8.0:1** |
  | Draft | `bg-muted text-muted-foreground`, dot `bg-muted-foreground/60` | `#6e5d63` on `#f7eef0`: **5.41:1** | `#c2adb4` on `#33252b`: **6.89:1** |

  - Draft is already checked (`muted-foreground` / `muted`).
  - Active uses the same alpha mix as the landing stat chip (`success/10`), which the script cannot read (it only reads hex tokens). Write the measured values in a comment next to the pill, as the landing did.
  - The text, not the dot, carries the meaning. The dot is `aria-hidden`.
- **Status filter:** yes, add one. The table is the only place where drafts are visible, since the dashboard only shows active surveys.
  - Single choice "All / Active / Draft" in a `DropdownMenuRadioGroup`.
  - `?status=active|draft`; no param means "all".

## 5. Checkboxes: lighter

### Before (shadcn `radix-nova` default) and after

The default `Checkbox` from the registry (`ui.shadcn.com/r/styles/radix-nova/checkbox.json`):

```text
peer relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input
… focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 …
dark:bg-input/30 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground …
```

- Unchecked, it is already light: a `border-input` outline, which is the opposite of the screenshot.
- **The problem is the opposite one:**
  - `--input` is `#efdfe4` (light) and `rgb(255 228 236 / 15%)` (dark);
  - that gives **1.28:1** on the white card and **1.53:1** on the plum card;
  - so the checkbox nearly disappears and fails the WCAG 1.4.11 minimum of 3:1 for a control's boundary.
- The design ask is "light, not black". The accessibility rule is "visible at 3:1". **A mid-tone pink-grey border satisfies both.**

**After**, in the table only (passed via `className`, so the shared `checkbox.tsx` keeps the shadcn defaults):

```ts
const TABLE_CHECKBOX =
  "size-4.5 rounded-[5px] border-control-border bg-card shadow-none dark:bg-card " +
  "data-checked:border-primary data-checked:bg-primary " +
  "data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground";
```

- **New token `--control-border`**, only for form controls whose border is their only boundary:

  | Theme | Value | On card | On page | On row hover (`accent/40`) |
  | ----- | ----- | ------- | ------- | -------------------------- |
  | Light | `#a08089` | 3.53:1 | 3.36:1 | 3.35:1 |
  | Dark | `#8a6b75` | 3.52:1 | 3.81:1 | 3.26:1 |

  - It sits between `--card-border` (decoration, 1.42:1) and `--muted-foreground` (text, 6.16:1). It reads as a light grey-pink outline, not a black square.
  - Add `["control-border", "card", UI, "checkbox border"]` and `["control-border", "background", UI, …]` to `check-contrast.mjs`.
- **Checked:** primary fill with a white check, which reads as "selected" in the brand color. Checked boxes only appear while selecting, so the pink does not dominate the table.
- **Indeterminate:** the select-all box when only some rows on the page are selected.
  - Radix sets `data-state="indeterminate"` and renders the indicator; the registry styles do not cover it, hence the extra classes.
  - Show a `MinusIcon` instead of `CheckIcon`: `checked === "indeterminate"` switches the icon.
- **Focus:** the default `focus-visible:ring-3 ring-ring/50` is faint on white. Use the solid ring as on the landing: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card` (the `--ring` / `card` pair, 5.04:1, is already checked).
- **Hit area:** the registry adds `after:-inset-x-3 after:-inset-y-2`, which gives a ~42×34px target. Keep it, and give the checkbox cell a fixed `w-12` so the target never overlaps the name.

### What selection is for

**Recommendation: keep the checkboxes, with bulk actions in their own phase (phase 3).** The request asks for them to be lighter, not removed, and the table is where an organization manages many surveys at once.

- **Selection bar:** selecting a row replaces the toolbar's right side with "N selected", then:
  - **Activate**;
  - **Move to draft**;
  - **Delete** (destructive, with confirmation);
  - **Clear**.
- **Bulk activate respects the limit:**
  - the server checks `active + selectedDrafts ≤ 5` in one call and applies all or nothing;
  - if it fails it returns `ACTIVE_LIMIT`, with the existing `surveyForm.errors.ACTIVE_LIMIT` message.
- **Bulk delete** uses an `AlertDialog`: "Delete N surveys? Responses are kept" (soft delete, same wording as the single delete).
- **Scope:**
  - selection is client state, limited to the current page;
  - it resets when the filters or the page change;
  - "select all" selects the rows of the current page.
- **Until phase 3**, ship the table without the checkbox column rather than with checkboxes that do nothing. A control with no effect is worse than none.

## 6. Columns and data

| Column | Content | Notes |
| ------ | ------- | ----- |
| (select) | checkbox | phase 3 |
| Survey | dot + name (link to `/surveys/[id]`) + code | name `font-semibold`; code `font-mono text-xs tracking-wider text-muted-foreground` |
| Type | category badge | `bg-accent text-primary` (4.56:1 light, 5.02:1 dark, already checked); text from `categories.X.title` |
| Status | pill (see 4) | |
| Responses | number in the selected range, or "—" | `format.number`; `tabular-nums`; right aligned |
| Last updated | relative date | see below |
| (actions) | "…" menu | see 8 |

### Dot color

- `Survey` has no color.
- A **color per category** repeats the Type badge.
- A **color derived from the id** is what the screenshot shows (pink, orange, teal, purple, blue, grey):
  - it helps tell rows apart while scanning;
  - it gives each survey a stable identity, usable later in charts and the kiosk.
- **Recommendation: a stable color derived from the id**, from a fixed palette of 6 brand-compatible tokens (`--chart-1` … `--chart-5` plus `--brand`).
  - Use `hash(survey.id) % palette.length`, so it is deterministic and the same on server and client.
  - It is **decorative** (`aria-hidden`) and never the only carrier of meaning: status has its pill, type its badge.
  - Draft rows keep their color. The pill says Draft; greying the dot would be a second, unlabeled status signal.
  - When surveys get a real `color` field (Prisma), the helper returns `survey.color ?? derived`.

### Responses

- Count **within the selected date range**, which is what the range control means (see "One date control" below).
- Data: `MOCK_RESPONSES.filter(surveyId, inRange).length`. Add a small `countMockResponses(surveyId, range)` export in `mock-data.ts` instead of building full metrics per row.
- Show "—" (`aria-label` "No responses") for 0.
- The column header gets a visually hidden suffix with the range ("Responses, last 30 days"), so screen readers know the window.

### Last updated

- Format on the client with `useFormatter`, against a `now` that the server passes down as `MOCK_NOW` (ISO string). There is no clock on the server and no hydration mismatch.
  - Compare calendar days **in `TIME_ZONE`**: add a locale-independent `getDayOffset(date, now, timeZone)` in `src/lib/format.ts`, which compares `Intl.DateTimeFormat("en-CA", { timeZone })` dates.
  - Offset 0 → `t("updated.today", { time })`; offset 1 → `t("updated.yesterday", { time })`. `time` is `format.dateTime(date, { timeStyle: "short" })`.
  - Otherwise: `format.dateTime(date, { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })`.
  - en-US: "Today, 10:24 AM", "Oct 08, 2026, 2:05 PM". es-MX: "Hoy, 10:24", "08 oct 2026, 14:05".
  - The screenshot's lowercase "am" is en-GB style. Keep the locale's own format.
- Wrap it in `<time dateTime={iso}>`.

### Sort

- Fixed order: `updatedAt` desc, then `name` for ties.
  - Editing a survey moves it to the top, which matches "keep track".
- No sortable columns in this round: with 5–20 surveys per organization (5 active at most), sorting adds UI without value.
  - The query shape below accepts a `sort` later.

### One date control

- **What it does:** the date control selects the window for the Responses column.
  - It keeps the dashboard's meaning ("Last 30 days" changes the numbers, not which surveys exist).
  - It reuses `RANGE_KEYS` / `parseRange`.
  - A row filter on `updatedAt` would hide surveys depending on when someone last edited them, which is confusing and not in any workflow of the overview.
- **Where it goes:** keep it **in the heading, on the right**, as the dashboard places it, and drop the toolbar "Date" button.
- **The toolbar** then holds search + Type + Status, all of which filter rows.

## 7. Filters, URL state and the query

### Query params

| Param | Values | Default (omitted) | Parsing |
| ----- | ------ | ----------------- | ------- |
| `q` | text | `""` | `typeof q === "string" ? q : ""` |
| `type` | `satisfaction,rating,poll` (comma list, lowercase) | all | split, keep known categories, de-duplicate |
| `status` | `active` \| `draft` | all | known value or all |
| `range` | `7d` \| `30d` \| `90d` \| `month` | `30d` | `parseRange` |
| `page` | 1-based integer | 1 | `Math.max(1, parseInt)`, clamped to `pageCount` |

- **Writing:** a `buildSurveysHref(params)` helper writes only non-default values, like `CollectionsToolbar.updateUrl`. It uses `router.replace(…, { scroll: false })`.
- **Search** keeps the 300 ms debounce and the "synced when the URL changes from outside" logic. Extract that logic from `CollectionsToolbar` into a `useUrlSearch` hook rather than duplicating it.
- **Any filter change resets `page`** to 1.
- **Page size:** 10.
  - The 5-active limit keeps most organizations under one page.
  - Pagination still matters for drafts and future imports from Kraquen.

### Query function

The new file `src/lib/surveys/list.ts` (server) has the shape of the future `GET /api/v1/surveys` (overview: `?active=`, `?category=`, search, pagination):

```ts
export interface SurveyListParams {
  query: string;
  categories: SurveyCategory[]; // empty = all
  status: "all" | "active" | "draft";
  range: RangeKey;
  page: number;
  pageSize: number;
}

export interface SurveyRow {
  id: string;
  code: string;
  name: string;
  category: SurveyCategory;
  isActive: boolean;
  responses: number; // in range
  updatedAt: string; // ISO
  publicUrl: string;
  colorIndex: number;
}

export interface SurveyListResult {
  rows: SurveyRow[];
  total: number; // after filters
  totalAll: number; // before filters: decides "no surveys" vs "no results"
  activeCount: number; // for the 5-active limit in the menu
  page: number; // clamped
  pageCount: number;
  now: string; // MOCK_NOW, for relative dates
}

export function listSurveys(organizationId: string, params: SurveyListParams): SurveyListResult;
```

- **The service:** add `listSurveys(organizationId)` (every visible survey, active and draft) to `service.ts`. `list.ts` filters, sorts, paginates and adds the responses, as `dashboard.ts` does for the cards.
- **Move `matchesQuery`** from `dashboard.ts` into `list.ts`, or a shared `src/lib/surveys/search.ts`, and import it in both places.
- **`SurveyRow` is plain data**, with no `Date` and no questions. The Client Component receives exactly what it renders.
- With Prisma, `listSurveys` becomes one `findMany` with `where` / `orderBy` / `skip` / `take` + `count`. Responses become a `$group` by `surveyId` on `SurveyResponse` for the page's ids.

### Page structure

```text
src/app/(app)/surveys/
├── page.tsx        // Server Component: shell + <Suspense fallback={<SurveysTableSkeleton />}>
│                   //   <SurveysContent searchParams={searchParams} /> awaits params, calls listSurveys
├── loading.tsx     // same skeleton (route transitions)
├── new/page.tsx
└── [id]/page.tsx
src/components/surveys/table/
├── SurveysTableSection.tsx  // client: heading (title, count, subtitle, range select) + card
├── SurveysToolbar.tsx       // search, Type, Status (and the selection bar in phase 3)
├── SurveysTable.tsx         // <Table> desktop, md and up
├── SurveysList.tsx          // stacked list below md (see 9)
├── SurveyRowMenu.tsx        // "…" actions
├── SurveyStatusPill.tsx
├── SurveyDot.tsx
├── SurveysPagination.tsx
└── SurveysTableSkeleton.tsx
```

- The page title "Surveys" and "New survey" are already in the top bar, which stays as it is.
- The heading inside the page is the screenshot's "All surveys {count}".
- **Metadata:** `title: "Surveys"`, following the dashboard. The server renders English only.

### Pagination

- **Footer text:** "Showing {from}–{to} of {total} surveys". It is an ICU plural on `total`, and it is hidden when `total` is 0.
- **Pager:**
  - previous / next icon buttons, labeled "Previous page" / "Next page", disabled at the ends;
  - page buttons only for pages that exist (with an ellipsis after 7 pages);
  - the current page is filled pink (`bg-primary text-primary-foreground`, `aria-current="page"`);
  - the pager is wrapped in `<nav aria-label="Pagination">`.
- **The page buttons are `Link`s** to the URL with `page`, so they work without JS and the page survives a reload.
- **Hide the pager** when `pageCount` is 1. The screenshot's fake page 2 is not reproduced.

## 8. Row actions

**The name links to `/surveys/[id]`.**

- It is a real `<Link>`, so it is focusable and opens in a new tab with a middle click.
- No clickable `<tr>`: a row with a checkbox, a link and a menu inside cannot be one big button without nesting interactive elements.
- The hover tint covers the whole row, as in the screenshot.

**The "…" menu** (`DropdownMenu`, `align="end"`). The trigger is a ghost icon button with `aria-label` "Actions for {name}".

| Item | Behavior |
| ---- | -------- |
| Edit | `Link` to `/surveys/[id]` |
| Copy link | `navigator.clipboard.writeText(publicUrl)` + toast `surveyCard.linkCopied` |
| Copy code | same with `code` + `results.codeCopied` |
| Activate / Move to draft | the new `setSurveyActive(id, isActive)` Server Action (see below) |
| — separator — | |
| Delete… | opens `DeleteSurveyDialog` (destructive item) |

- **Activate when the limit is reached:**
  - the item stays enabled, and the server returns `ACTIVE_LIMIT` → `toast.error(t("errors.ACTIVE_LIMIT", { limit: 5 }))`;
  - **also** show a hint in the menu ("5 of 5 active") using `activeCount`, so the user knows before clicking;
  - the server is the authority: the count can change between render and click.
- **The new service function** `setSurveyActive(scope, id, isActive)`:
  - runs `assertActiveLimit(organizationId, isActive && !stored.isActive)`;
  - sets `isActive` and `updatedAt`.
  - It does not reuse `updateSurvey`, which needs the whole form and would re-merge questions.
- **The new action** `setSurveyActive` has the same `ActionResult` shape and `toErrorResult` as the others.
- **Revalidation:** every action that changes surveys (`create`, `update`, `delete`, `setSurveyActive`) calls `revalidatePath("/dashboard")` **and** `revalidatePath("/surveys")`. From the table, call `refresh()` so the current page re-renders with the URL it has.
- **`DeleteSurveyDialog`:**
  - Add an optional `onDeleted?: () => void` prop.
  - Default (form page): `router.push("/dashboard")`, as today.
  - From the table, stay on the page: `refresh` + toast. If the deleted row was the only one on the last page, the server clamps `page`.
- **Keyboard:** Tab reaches the name link, then the menu trigger. The menu has arrow keys and Escape, and focus returns to the trigger (Radix).

## 9. Empty, loading and responsive

### Empty states

These reuse `EmptyState`.

- **No surveys at all** (`totalAll === 0`):
  - `ClipboardListIcon`, "No surveys yet", "Create your first survey to start collecting feedback.";
  - a primary "Create survey" `Link` to `/surveys/new`.
  - The toolbar and the pager are hidden.
- **No results** (`totalAll > 0 && total === 0`):
  - `SearchIcon`, "No surveys match your filters";
  - "Clear filters", a `Link` to `/surveys` that keeps `range` if it is not the default (like `clearSearchHref` on the dashboard).
  - The toolbar stays, so the filters can be changed.

### Loading

- `SurveysTableSkeleton` keeps the heading, the toolbar and 6 rows of `Skeleton` bars with the column widths.
- It is used as the `<Suspense>` fallback and in `loading.tsx`, so filter changes and navigations don't shift the layout.

### Responsive

**Recommendation: a stacked list below `md`, the real table from `md` up.** Horizontal scroll hides the status and the actions behind a swipe on the screen where the user is most likely to check "is it active?".

| Width | Layout |
| ----- | ------ |
| `< md` (375, 500) | **Toolbar:** search full width; Type and Status side by side below it. **List:** one item per survey, with the checkbox, dot + name + code, and the "…" menu on the first line, then the type badge, status pill and responses on the second line, then "Updated …" muted on the third. Pager centered. |
| `md – lg` (768) | The table, without the Type column. Type moves under the name, next to the code, as a small badge. |
| `≥ lg` (1280) | The full table as in the screenshot. |

- **Both layouts are rendered from the same `SurveyRow[]`** and the same small pieces (`SurveyDot`, `SurveyStatusPill`, `SurveyRowMenu`). The list uses `<ul>` / `<li>`, because it is not a table.
- **Only one layout is visible at a time** (`hidden md:block` / `md:hidden`), and the hidden one is `display: none`, so screen readers never get both.
- **The table container** is `overflow-x-auto` as a safety net at exactly `md`, with no page overflow at 375, 500, 768 or 1280px.

## 10. Accessibility

- **Table semantics:** a real `<table>` (shadcn `Table`) with:
  - `<caption className="sr-only">` "All surveys";
  - `<th scope="col">` for every column. The checkbox and actions columns have sr-only header text ("Select", "Actions").
  - The name cell is `<th scope="row">`, so each row is announced by its survey.
- **Checkboxes:**
  - `aria-label` "Select {name}";
  - the header box is labeled "Select all surveys on this page", and its indeterminate state is announced as "mixed" (Radix).
  - The selection count lives in a polite live region ("2 selected").
- **Status:** the pill text is the status, and the dot is `aria-hidden`. Nothing depends on color alone (the dot color is decorative, see 6).
- **Responses:** "—" has `aria-label` "No responses", and the column header includes the range for screen readers.
- **Filters:** Type and Status triggers show the active count in the label ("Type · 2") and an `aria-label` with the full state ("Type filter, 2 selected").
- **Live results:** after filtering, the "Showing …" text sits in a polite live region, so screen readers hear the new total.
- **Pagination:** `nav` with a label, `aria-current="page"`, and disabled previous / next marked `aria-disabled`.
- **Focus:** solid `--ring` on every link, button, checkbox and menu trigger (3:1 checked). Tab order: range → search → Type → Status → select all → per row (checkbox, name, menu) → pager.

## 11. i18n

New `surveys` namespace in `en.json` / `es.json`. Every string is listed here; the `nav.history` keys are removed.

| Key | en | es |
| --- | -- | -- |
| `surveys.title` | All surveys | Todas las encuestas |
| `surveys.subtitle` | Manage your surveys and keep track of every response. | Administra tus encuestas y sigue cada respuesta. |
| `surveys.caption` | All surveys | Todas las encuestas |
| `surveys.toolbar.search` | Search surveys | Buscar encuestas |
| `surveys.toolbar.type` | Type | Tipo |
| `surveys.toolbar.typeLabel` | Type filter, {count, plural, =0 {all} one {# selected} other {# selected}} | Filtro de tipo, {count, plural, =0 {todos} one {# seleccionado} other {# seleccionados}} |
| `surveys.toolbar.status` | Status | Estado |
| `surveys.toolbar.statusAll` | All | Todas |
| `surveys.toolbar.range` | Date range | Rango de fechas |
| `surveys.columns.select` | Select | Seleccionar |
| `surveys.columns.survey` / `type` / `status` / `responses` / `updated` / `actions` | Survey / Type / Status / Responses / Last updated / Actions | Encuesta / Tipo / Estado / Respuestas / Última actualización / Acciones |
| `surveys.columns.responsesRange` | Responses, {range} | Respuestas, {range} |
| `surveys.status.ACTIVE` / `DRAFT` | Active / Draft | Activa / Borrador |
| `surveys.noResponses` | No responses | Sin respuestas |
| `surveys.updated.today` / `yesterday` / `label` | Today, {time} / Yesterday, {time} / Updated {date} | Hoy, {time} / Ayer, {time} / Actualizada {date} |
| `surveys.select.row` / `all` / `count` | Select {name} / Select all surveys on this page / {count, plural, one {# selected} other {# selected}} | Seleccionar {name} / Seleccionar todas las encuestas de esta página / {count, plural, one {# seleccionada} other {# seleccionadas}} |
| `surveys.actions.label` | Actions for {name} | Acciones de {name} |
| `surveys.actions.edit` / `copyLink` / `copyCode` / `activate` / `deactivate` / `delete` | Edit / Copy link / Copy code / Activate / Move to draft / Delete… | Editar / Copiar enlace / Copiar código / Activar / Pasar a borrador / Eliminar… |
| `surveys.actions.activeCount` | {count} of {limit} active | {count} de {limit} activas |
| `surveys.toasts.activated` / `deactivated` | Survey activated / Survey moved to draft | Encuesta activada / Encuesta pasada a borrador |
| `surveys.bulk.*` (phase 3) | Activate / Move to draft / Delete / Clear selection / Delete {count, plural, …}? … | Activar / Pasar a borrador / Eliminar / Limpiar selección / … |
| `surveys.pagination.label` / `previous` / `next` / `page` | Pagination / Previous page / Next page / Page {page} | Paginación / Página anterior / Página siguiente / Página {page} |
| `surveys.pagination.showing` | Showing {from}–{to} of {total, plural, one {# survey} other {# surveys}} | Mostrando {from}–{to} de {total, plural, one {# encuesta} other {# encuestas}} |
| `surveys.empty.title` / `description` / `cta` | No surveys yet / Create your first survey to start collecting feedback. / Create survey | Aún no hay encuestas / Crea tu primera encuesta para empezar a recibir feedback. / Crear encuesta |
| `surveys.noResults.title` / `clear` | No surveys match your filters / Clear filters | Ninguna encuesta coincide con tus filtros / Limpiar filtros |

- The type badge reuses `categories.X.title`. Range labels reuse `dateRange.<key>`. Error toasts reuse `surveyForm.errors.*`.
- Numbers (`count`, responses, `from`/`to`) go through `format.number` before interpolation, or ICU `{n, number}`, so es-MX gets its separators.

## 12. Dark mode

| Element | Light | Dark |
| ------- | ----- | ---- |
| Card | `bg-card` white, `border-card-border` | `#261b20`, `#4a323b` border |
| Header labels | `text-muted-foreground` (6.16:1) | `#c2adb4` |
| Row divider | `border-card-border` | same token |
| Row hover | `bg-accent/40` (muted text still 5.92:1) | `accent/40` over card (7.35:1) |
| Type badge | `bg-accent text-primary` 4.56:1 | 5.02:1 |
| Active pill | 4.74:1 | 8.0:1 |
| Draft pill | 5.41:1 | 6.89:1 |
| Checkbox border | `--control-border` `#a08089`, 3.53:1 | `#8a6b75`, 3.52:1 |
| Checked checkbox | `bg-primary` `#a85569` + white check | `#db8396` + `#210a10` check (primary-foreground) |
| Current page | `bg-primary` | same |
| Dots | `--chart-*` / `--brand` | their dark values (already brighter) |

All text pairs are already in `check-contrast.mjs` except the alpha pills and the new `control-border` pairs (add the latter; comment the measured values for the pills).

## 13. Dashboard link

- **Add a "View all" link** next to "Your collections" on the dashboard, a text `Link` to `/surveys` (`dashboard.surveys.viewAll`).
  - The dashboard only lists active surveys; this is the way to reach drafts besides the sidebar.
- **Don't change** the cards, their edit buttons or `CreateSurveyCallout`.

## 14. Verification

- `yarn lint` (messages parity without `nav.history`, contrast including `control-border`), `tsc`, `yarn build`.
  - The route table shows `/surveys` as `◐` (partial prerender: static shell + streamed `searchParams` content), like `/dashboard`.
- Screenshots at 375, 768 and 1280px; light and dark; English and Spanish. Compare with `table-design-view.png`, minus the ignored chrome, the Paused pill, the Date button and the fake page 2.
- **Keyboard:**
  - Tab follows range → search → Type → Status → select all → rows (checkbox, name, menu) → pager.
  - Menus open with Enter / Space, close with Escape and return focus.
  - A visible ring is on every stop.
- **URL:** `/surveys?q=store&type=satisfaction&status=active&range=7d&page=1` restores the same view after a reload. Changing a filter resets `page`; "Clear filters" keeps `range`.
- **Limit:**
  - with 5 active surveys, "Activate" on a draft shows the `ACTIVE_LIMIT` toast and changes nothing;
  - after "Move to draft" on one active survey, activating the draft works;
  - the dashboard reflects both changes.
- **Delete** from the menu removes the row, stays on `/surveys`, shows the toast, and the dashboard updates.
- **Sidebar:**
  - History is gone and Surveys is enabled;
  - Surveys is highlighted on `/surveys`, `/surveys/new` and `/surveys/[id]`.
- No page overflow and no console errors.

## 15. Recommendation

- **Data:**
  - `listSurveys` in the service (every visible survey);
  - `src/lib/surveys/list.ts` with `listSurveys(organizationId, params)` that filters, sorts by `updatedAt` desc and paginates on the **server**, and adds the responses in range;
  - plain `SurveyRow` objects to the client.
  - This is the same contract as the future `GET /api/v1/surveys`.
- **Table:** plain **shadcn `Table`**, no TanStack Table.
  - Filtering, sorting and paging happen on the server through the URL.
  - Selection is a `Set<string>` in client state.
  - TanStack would only manage state the URL already owns.
- **Status:** `isActive` → Active / Draft, with a status filter. No schema change.
- **Checkboxes:**
  - a new `--control-border` token (3.5:1), card background, primary only when checked, indeterminate for select all, solid focus ring;
  - they ship with bulk activate / move to draft / delete in phase 3, and are absent until then.
- **Dot:** a stable color from the id over 6 brand-compatible tokens, decorative.
- **Date:** one range control in the heading, for the Responses column. The toolbar "Date" button is dropped.
- **Responsive:** a stacked list below `md`, the table without Type at `md – lg`, the full table from `lg`.
- **History:** removed from the sidebar and the messages. The table replaces the "History list" in the overview.

### Phases (one spec each)

1. **Sidebar + route + read-only table:**
   - remove History and enable Surveys;
   - `listSurveys` + `list.ts`;
   - `/surveys` page with heading, range, table (dot, name link, code, type, status pill, responses, last updated), stacked list below `md`, skeleton, empty state;
   - messages;
   - overview updated (navigation, routes, structure, checklist);
   - the dashboard "View all" link.
2. **Filters + pagination:**
   - search, Type and Status in the URL, with the shared `useUrlSearch` hook;
   - `page` with clamping, the pager and "Showing …";
   - the no-results state with "Clear filters".
3. **Row actions + selection:**
   - the "…" menu: edit, copy link, copy code, activate / move to draft with the limit, delete;
   - `setSurveyActive` service + action;
   - `revalidatePath("/surveys")` in every action;
   - `DeleteSurveyDialog` `onDeleted`;
   - the light checkboxes (`--control-border`, contrast pairs), select all with indeterminate, the selection bar with bulk actions.
4. **Polish:**
   - 375 / 500 / 768 / 1280 pass;
   - dark mode;
   - keyboard and screen reader pass;
   - screenshots compared with the reference.
