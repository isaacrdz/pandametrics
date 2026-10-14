# Current Feature: Surveys Table Filters

## Status

In Progress

## Goals

- URL state on `/surveys`:
  - `q` (name or code, accent and case insensitive);
  - `type` (comma list of `satisfaction`, `rating`, `poll`);
  - `status` (`active` | `draft`);
  - `range` (`RANGE_KEYS`, default `30d`);
  - `page` (1-based).
  - Only non-default values are written; reloads and shared links restore the view.
- `src/lib/surveys/list-params.ts`:
  - `parseSurveyListParams(searchParams)` (unknown values fall back to defaults, categories de-duplicated);
  - `buildSurveysHref(params)` (only non-default values; any filter change drops `page`).
- `listSurveys(organizationId, params)`:
  - takes `query`, `categories`, `status`, `range`, `page` and `pageSize` (10);
  - filters, sorts and paginates on the server;
  - returns `total` (after filters), `totalAll`, `page` (clamped to `pageCount`) and `pageCount`.
- `SurveysToolbar` (client, inside the card):
  - search input (`type="search"`, 300 ms debounce, synced when the URL changes from outside);
  - **Type**: `DropdownMenuCheckboxItem` per category, the label shows the count ("Type · 2") with an `aria-label` for the full state;
  - **Status**: `DropdownMenuRadioGroup` with All / Active / Draft;
  - layout: search full width with the filters below it on narrow cards, search left and filters right on wide cards.
- Shared `useUrlSearch` hook extracted from `CollectionsToolbar` and used by both toolbars; the dashboard behavior is unchanged
- `SurveysPagination`:
  - "Showing {from}–{to} of {total} surveys": ICU plural with formatted numbers, in a polite live region, hidden when `total` is 0;
  - previous / next icon buttons with labels, `aria-disabled` at the ends;
  - one `Link` per page, with an ellipsis after 7 pages;
  - the current page is `bg-primary text-primary-foreground` with `aria-current="page"`;
  - wrapped in `<nav aria-label="Pagination">`;
  - hidden when there is one page; links keep the other params and work without JS.
- No-results state (`totalAll > 0 && total === 0`):
  - `EmptyState` with `SearchIcon`, "No surveys match your filters" and "Clear filters";
  - "Clear filters" is a link to `/surveys` that keeps a non-default `range`;
  - the toolbar stays visible.
- The range select keeps the other filters when it changes (it no longer drops them) and resets `page`
- Messages in en/es: `toolbar.search`, `toolbar.type`, `toolbar.typeLabel`, `toolbar.status`, `toolbar.statusAll`, `pagination.*`, `noResults.*`

## Notes

- Phase 2 of 4 of the surveys table (spec: `context/features/surveys-table-filters-spec.md`, research: `docs/surveys-table.md` sections 4, 7, 9, 10, 11)
- Requires phase 1: `/surveys`, `src/lib/surveys/list.ts`, `SurveysTable`, `SurveysList`, `SurveysTableSection`
- Server-side filtering: the client only renders `SurveyRow[]`; the params have the shape of the future `GET /api/v1/surveys`
- The Status filter exists because the table is the only place drafts are visible
- There is no "Date" button; the range stays in the heading and only sets the window of the Responses column
- The pager only shows pages that exist (no fake page 2 as in the screenshot)
- The table and list switch with container queries (`@2xl`), and the toolbar layout should follow the same card width
- Not in this phase: row menu, checkboxes and bulk actions (phase 3); final polish (phase 4)
- Adjusted during implementation:
  - **`useUrlSearch`** lives in `src/hooks/use-url-search.ts` and returns `{ search, handleChange, commit }`. `commit` cancels a pending search so the dashboard range select writes `q` and `range` together.
  - **`withFilters(params, changes)`** in `list-params.ts` applies a filter change and resets `page`. **`getPageItems`** builds the pager (every page up to 7, then first / neighbors / last with ellipses).
  - **`EmptyState`** got an optional `className`, so the no-results state sits borderless inside the card.
  - **The "Showing …" footer** stays visible with a single page; only the pager hides.
  - **The skeleton** now includes the toolbar and the footer.
  - **The Type menu** stays open while picking (`onSelect` prevents close); filters are highlighted in pink while active ("Type · 2", "Status · Draft").
- Fixed in review: a filter or range picked within 300 ms of typing was undone when the debounced search fired with the old params.
  - `useUrlSearch` now calls the latest `onSearch` (ref).
  - The search state lives in `SurveysTableSection` and is passed to `SurveysToolbar`.
  - Filters and the range include the pending text through `commit(search)`.
- 7 draft surveys ("Borrador de prueba 1–7") were created through the form to test paging. They live in the in-memory store and disappear when `yarn dev` restarts.
- Verification:
  - `yarn lint`, `tsc` and `yarn build` pass;
  - `/surveys?q=store&type=satisfaction&status=active&range=7d` restores the same view after a reload;
  - accents and case are ignored ("PRUEBAS" finds "Pruebas con QR");
  - "Clear filters" keeps only `range`;
  - with more than 10 surveys, page 2 works, a filter change goes back to page 1, and `?page=99` clamps to the last page;
  - dashboard search still works;
  - both menus work with the keyboard and the total is announced;
  - 375 / 768 / 1280px in light, dark, English and Spanish, with no console errors.

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
- **Surveys Table Base** (2026-10-13): phase 1 of 4. History removed from the sidebar and Surveys enabled. `/surveys` read-only table of every survey (active and draft) from `src/lib/surveys/list.ts`: stable color dot, name link + code, type badge, Active / Draft pill (`isActive`), responses in the selected range (`?range=`), Today / Yesterday dates in `TIME_ZONE`. Stacked list on narrow cards (container queries, since the sidebar takes width), skeleton and empty state. Dashboard "View all" link, `surveys` messages, shadcn `table`, overview updated (History replaced by the table)
