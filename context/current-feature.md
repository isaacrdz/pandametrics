# Current Feature: Surveys Table Base

## Status

In Progress

## Goals

- Sidebar:
  - History removed (`NavMain` item, `"history"` in `NavKey`, unused `ChartColumnIcon`, `nav.history` in en/es);
  - Surveys enabled (`/surveys`) and highlighted on `/surveys`, `/surveys/new` and `/surveys/[id]`.
- Data:
  - `listSurveys(organizationId)` in `service.ts` returns every visible survey (active and draft);
  - `countMockResponses(surveyId, range)` in `mock-data.ts`;
  - `src/lib/surveys/list.ts` builds `{ rows: SurveyRow[], totalAll, activeCount, now }`. `SurveyRow` is plain data (`id`, `code`, `name`, `category`, `isActive`, `responses` in range, `updatedAt` ISO, `publicUrl`, `colorIndex`). It is sorted by `updatedAt` desc then `name`, and shaped so phase 2 can add filters and paging;
  - `matchesQuery` moved to `src/lib/surveys/search.ts` (the dashboard keeps using it).
- Route `/surveys`:
  - a Server Component with `metadata.title` "Surveys";
  - `searchParams` (`range`) awaited inside `<Suspense fallback={<SurveysTableSkeleton />}>`;
  - `loading.tsx` with the same skeleton;
  - `yarn build` lists it as `◐`.
- `SurveysTableSection` (client):
  - heading "All surveys" + muted count + subtitle;
  - the range `Select` writing `?range=` (omitted when default);
  - the card holding the table or the list.
- `SurveysTable` (from `md`):
  - sr-only caption;
  - `th scope="col"` headers (muted, uppercase, wide tracking);
  - name cell as `th scope="row"`;
  - columns Survey, Type (hidden at `md – lg`, shown under the name), Status, Responses, Last updated;
  - `border-card-border` dividers and `bg-accent/40` hover.
- `SurveysList` (below `md`): a `<ul>` with dot + name + code, then type, status and responses, then "Updated …"
- Shared pieces:
  - `SurveyDot`: stable `hash(id) % 6` over `--chart-1…5` + `--brand`, `aria-hidden`;
  - `SurveyStatusPill`: Active `bg-success/10 text-success-foreground` + `bg-success` dot (4.74:1 / 8.0:1 in a comment), Draft `bg-muted text-muted-foreground`;
  - type badge `bg-accent text-primary` with `categories.X.title`.
- Cells:
  - the name is a `Link` to `/surveys/[id]`, with the code below in mono and muted;
  - responses use `format.number` and `tabular-nums`, right aligned; "—" with `aria-label` "No responses" for 0; the header has an sr-only range suffix;
  - last updated uses `getDayOffset(date, now, TIME_ZONE)` in `src/lib/format.ts`: "Today, {time}" / "Yesterday, {time}", otherwise `format.dateTime`, inside `<time dateTime>`.
- States:
  - `SurveysTableSkeleton`: heading + 6 rows;
  - empty state (`totalAll === 0`): "No surveys yet" with a "Create survey" link to `/surveys/new`.
- Dashboard: a "View all" link to `/surveys` next to the surveys heading (`dashboard.surveys.viewAll`)
- Messages: the `surveys` namespace in en/es for this phase (`title`, `subtitle`, `caption`, `toolbar.range`, `columns.*`, `status.*`, `noResponses`, `updated.*`, `empty.*`), reusing `categories.X.title` and `dateRange.<key>`
- `project-overview.md`:
  - History removed from the navigation concept, the route tree and the structure;
  - the checklist item becomes "Survey table with search, filters and pagination";
  - "history list" dropped from phase 2.

## Notes

- Phase 1 of 4 of the surveys table (spec: `context/features/surveys-table-base-spec.md`, research: `docs/surveys-table.md`)
- Copy only the table content of `context/screenshots/table-design-view.png`; its sidebar and top bar are ignored, and `AppSidebar` / `TopBar` stay as they are
- Status: `isActive` → Active, otherwise Draft. No new field, no "Paused".
- One date control: the range in the heading sets the window of the Responses column and does not filter rows. There is no toolbar "Date" button.
- Not in this phase:
  - search, filters and pagination (phase 2);
  - row menu, checkboxes and bulk actions (phase 3);
  - final responsive / dark / keyboard pass (phase 4).
- Plain shadcn `Table` (install `table`); no TanStack Table
- `cacheComponents: true`: no `new Date()` on the server, so "now" is `MOCK_NOW`; translated text only in Client Components
- Adjusted during implementation:
  - **Container queries instead of viewport breakpoints:** the card is `@container`, the table shows from `@2xl` (42rem) and the Type column from `@4xl` (56rem). With the sidebar open, a 768px viewport leaves the card only ~450px wide, so `md` cut the table.
  - **No `surveys/loading.tsx`:** a `loading.tsx` there would also wrap `/surveys/new`, which has none, and flash the table skeleton. The page's `<Suspense>` fallback already covers `/surveys`.
  - **Stacked list:** it shows "{count} responses" (plural from `common.responses`) or "No responses", and "Last updated · {date}". The `updated.label` key was dropped.
  - **Mixed clocks:** surveys edited in the form get the real clock while "now" is `MOCK_NOW`, so a survey edited later than `MOCK_NOW` on another day shows a full date instead of "Today". This is fine until the database exists.
- Verification:
  - `yarn lint`, `tsc` and `yarn build` pass;
  - the 5 seeded surveys show (4 Active, "Pruebas con QR" Draft), newest first;
  - responses follow the range, and the range survives a reload;
  - created or edited surveys move to the top, deleted ones disappear;
  - the sidebar is correct;
  - 375 / 768 / 1280px with no overflow, in light, dark, English and Spanish, with no console errors.

## History

<!-- Keep this updated. Earliest to latest -->

- **Init Project** (2026-10-13): cleaned the Create Next App boilerplate (index only shows an `h1` with "Panda Metrics"), moved `app/` to `src/app/` with `@/*` → `./src/*`, light theme by default with a `.dark` class, Geist font applied, removed boilerplate SVGs, new README, ignored `.claude/settings.local.json`, and connected `origin` to `git@github.com:Ellyonsoft/panda-metrics.git`
- **Dashboard View** (2026-10-13): shadcn/ui (Nova, Radix, Lucide) with Panda Metrics theme tokens, `next-themes` (light default) and sonner; app shell with collapsible sidebar (Dashboard, Encuestas, Historial, Configuración) and top bar; `/` redirects to `/dashboard`; stat cards (Respuestas totales, Encuestas activas, Respuestas hoy), search and date range in the URL inside `Suspense`, skeletons and empty states; survey cards with question carousel and Satisfaction / Rating / Poll charts, icon buttons to copy link, copy code and edit; data from `src/lib/mock-data.ts` through `src/lib/dashboard.ts`
- **Internationalization** (2026-10-13): next-intl without URL routing; language in `localStorage` (`panda-metrics:locale`, English default, Spanish) read by a client `LocaleProvider`, inline head script that hides the page until a non-default language is applied, remount on the first locale divergence to avoid hydration mismatches in streamed Suspense boundaries; server renders English, translated text in Client Components; all copy in `src/messages/{en,es}.json` with ICU plurals, formatting through `useFormatter` (`en-US` / `es-MX`); `LanguageSwitcher` with SVG flags in the top bar; `react/jsx-no-literals` and message key parity check in `yarn lint`
- **Survey Form** (2026-10-13): `/surveys/new` and `/surveys/[id]` share one `SurveyForm` (only `FORM_MODES` knows create vs. edit); Zod 4 schema with per-category rules and message-key errors; category picker locked when the survey has responses; per-category editors (unique reactions with label and color, generated rating stars, 2–5 poll options) with counters and limits; Server Actions returning error codes; in-memory survey store (`src/lib/surveys/service.ts`) with the future Prisma API (merge by id, archiving by omission, 5-active limit, soft delete) read by the dashboard; share panel (SVG QR, PNG download, link and code copy, created at / by), delete with confirmation, unsaved changes dialog and `beforeunload`, 500px and dark mode checked
- **Brand Tokens** (2026-10-13): rebranded the theme to the logo pink; light primary `#a85569` (logo hue darkened for AA), dark mode on plum-brown surfaces with the logo pink `#db8396` as primary and dark-brown text; new `--brand` and `--inverse` tokens, `--highlight` follows the primary; survey data, status and destructive colors unchanged; `scripts/check-contrast.mjs` in `yarn lint`; `StatCard` highlight text at full opacity; landing research and 4 phase specs
- **Logo Assets** (2026-10-13): `scripts/brand-assets.mjs` (sharp) generates the app icon, Apple icon, logo tile, hero illustration and Open Graph / Twitter images from `design/logo-source.png` (losslessly recompressed to 9 MB); default favicon replaced; `metadataBase` from `PANDA_PUBLIC_URL`; `Logo` component in the sidebar (icon only when collapsed)
- **Landing Page** (2026-10-13): public landing at `/` in a static `(marketing)` route group (redirect removed); nav with logo, section links, language switcher and account CTAs (to `/dashboard` via `LANDING_LINKS`); hero with panda illustration and accessible illustrative stat card; features, new "How it works" section, dark CTA banner and footer; copy fixed and translated (`landing` namespace); metadata and `themeColor`; contrast checks for the new pairs
- **Landing Polish** (2026-10-13): `MobileNav` sheet (section links below `md`, full-width language switcher, account actions; closes on link click with focus back on the menu button); at `md – lg` the nav keeps logo + links + menu so the wordmark fits; 44px headline and full-width CTAs on phones, capped hero visual while stacked, centered footer; "Skip to content" link, solid pink `FOCUS_RING`, logo-pink ring on the dark CTA banner and banner border in dark mode; no overflow at 375/500/768/1280 in light, dark, English and Spanish
- **Hide Dev Indicator** (2026-10-13): `devIndicators: false` in `next.config.ts` (no spec, from `docs/dev-indicator.md`); hidden rather than moved because no corner is free in the landing and the admin; the error overlay still opens; static vs dynamic checked in the `yarn build` route table
