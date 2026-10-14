# Current Feature: Surveys Table Polish

## Status

In Progress

## Goals

- Responsive at 375, 500, 768 and 1280px:
  - narrow cards: stacked list, search full width with Type and Status below, the selection bar wraps without overflow, pager centered;
  - 768: table without the Type column (badge under the name), toolbar on one row;
  - 1280: full table as in the reference;
  - no page-level horizontal overflow (the table `overflow-x-auto` is only a safety net);
  - long survey names truncate with `title` in the table and the list, and codes never wrap;
  - only one layout (table or list) in the accessibility tree at a time.
- Dark mode, checked against `docs/surveys-table.md` section 12:
  - card, borders, dividers and row hover;
  - type badges and Active / Draft pills;
  - light checkboxes and the checked / indeterminate states;
  - current page, rows-per-page select, menus and dialogs;
  - dots.
  - Re-run `check-contrast.mjs`, adding any new pair.
- Accessibility:
  - table caption, `th scope="col"` / `th scope="row"`, pagination `nav` label;
  - a visible solid `--ring` on every interactive element;
  - tab order: range → search → Type → Status (or the selection bar) → select all → per row (checkbox, name, menu) → rows per page → pager;
  - status and type never conveyed by color alone;
  - no Radix console warnings (missing `Title` / `Description`) in menus and dialogs.
- Loading and transitions:
  - the skeleton matches the final layout at every width (list skeleton on narrow cards), so nothing shifts;
  - filter and page changes keep the previous content until the new one streams in, with no flash of an empty state.
- Pending items from the phase 1–3 reviews:
  - **Top bar date at 768px:** the date in the top bar wraps onto several lines when the sidebar is open; make it fit (truncate, shorter format or hide below a width) without hiding the greeting;
  - **Two `h1` on the page:** the top bar greeting and "All surveys" (also on the form pages) are both `h1`; keep one `h1` per page;
  - **Scroll on page change:** pager links use `scroll={false}`; after a page or page-size change, bring the top of the table into view (respecting reduced motion) without jumping on filter changes;
  - **Live regions that stay silent:**
    - "Showing X–Y of Z" is not announced when the list comes back from the no-results state;
    - "{count} selected" is not announced the first time rows are selected.
    - In both cases the region mounts together with its text: use live regions that stay mounted and only change their content;
  - **Tab order of the selection clear button:** the X sits before the bulk actions in the DOM but is shown last on wide cards; make the DOM order match the visual order in both layouts.
- Comparison with `table-design-view.png` (ignoring its sidebar and top bar), with the intended differences: no "Paused", no toolbar "Date" button, no fake page 2, light checkboxes. Spacing, type scale, uppercase headers and row height should match.

## Notes

- Phase 4 of 4 of the surveys table (spec: `context/features/surveys-table-polish-spec.md`, research: `docs/surveys-table.md` sections 9, 10, 12, 14)
- No new features: fix what the pass finds, plus the pending items listed in the goals
- The table and list switch with container queries (`@2xl`, `@4xl`), because the sidebar takes part of the width
- Rows per page (5 / 10 / 25 / 50, default 5) and the always-visible pager were added at the end of phase 3: include them in the pass
- The in-memory store resets when `yarn dev` restarts; create drafts through the form when testing paging, selection or empty states
- Done during the pass:
  - **Top bar:** the header is a container, so the organization name and the "New survey" label only show from `@3xl` (bar ≥ 768px). The date uses `dateStyle: "medium"` below `xl` and `"full"` above, on one truncated line. The greeting size follows the bar width.
  - **One `h1` per page:** the greeting became a `<p>`; `/surveys` and the form keep their own `h1`, and the dashboard got an sr-only `h1` (`DashboardTitle`). The surveys `h1` reads "All surveys 8" (space before the count).
  - **Scroll:** after a page or page-size change (`data.page:data.pageSize`), the card scrolls into view only if its top is above the viewport (`scroll-mt-24`, instant under reduced motion). Filter changes never scroll.
  - **Live regions:** two sr-only `aria-live="polite"` regions stay mounted in the section, one for results ("Showing …" / "No surveys match your filters") and one for selection. The visible "Showing …" text and the bar count are no longer live regions.
  - **Selection bar order:** the DOM order is now count, Activate, Move to draft, Delete, Clear, the same as on screen; narrow cards put the count on its own line.
  - **Pending state:** filter, range and page-size changes run in a transition; the card is dimmed with `aria-busy` while the new rows stream in.
  - **Codes:** survey codes never wrap.
- Fixed in review: the skeleton did not match the final layout.
  - It drew 6 rows (now `DEFAULT_PAGE_SIZE`, 5), single-line rows on narrow cards (now stacked list items) and no rows-per-page / pager.
  - Measured with JavaScript disabled (the Suspense fallback stays visible): 564 vs 568px at 1280, and 1002 vs 1034px at 375, where the gap is one real item whose responses wrap.
- Not tested in the browser: the "no surveys yet" state (it would need deleting every seeded survey); its code is unchanged since phase 1
- Verification:
  - `yarn lint`, `tsc` and `yarn build` (`◐ /surveys`) pass;
  - screenshots at 375, 500, 768 and 1280px, light and dark, English and Spanish, with data and in both empty states (no surveys, no results);
  - a keyboard-only walkthrough: filter, select, bulk action, row menu action, page change;
  - a screen reader check of the live regions (no-results → results, first selection);
  - no horizontal scroll, no console errors or warnings.

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
- **Surveys Table Filters** (2026-10-14): phase 2 of 4. URL state on `/surveys` (`q`, `type`, `status`, `range`, `page`) via `list-params.ts`; server-side search (accent and case insensitive), category and Active / Draft filters, sort and pagination by 10 with clamping. Toolbar with debounced search and Type / Status menus; pager with real pages only and a live "Showing X–Y of Z" text; no-results state with "Clear filters" keeping the range. Shared `useUrlSearch` hook (also on the dashboard) and a fix so a filter or range picked while typing is never undone
- **Surveys Table Actions** (2026-10-14): phase 3 of 4. Row "…" menu (edit, copy link / code, activate / move to draft with the active-limit hint, delete staying on `/surveys`). Light checkboxes with the new `--control-border` token (3:1, in the contrast check) and an indeterminate select all. Per-view selection with a bulk bar (activate, move to draft, delete), all or nothing on the server with the 5-active limit. New validated `setSurveyActive` / `setSurveysActive` / `deleteSurveys` actions; every survey action revalidates `/dashboard` and `/surveys`. Added on request: 5 rows per page by default (5 / 10 / 25 / 50, `?size=`) and an always-visible pager
