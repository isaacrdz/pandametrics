# Current Feature: Surveys Table Actions

## Status

In Progress

## Goals

- Tokens and contrast:
  - `--control-border` in `globals.css` (`#a08089` light, `#8a6b75` dark) + `--color-control-border` in `@theme`;
  - `check-contrast.mjs` checks `control-border` on `card` and on `background` (UI, 3:1).
- Light checkboxes:
  - install the shadcn `checkbox` (`radix-nova`);
  - table classes `size-4.5 rounded-[5px] border-control-border bg-card shadow-none dark:bg-card`, primary fill only when checked, indeterminate styled like checked with a `MinusIcon`;
  - solid focus ring (`ring-2 ring-ring ring-offset-2 ring-offset-card`), the registry hit area kept;
  - the shared `checkbox.tsx` keeps the shadcn defaults.
- Checkbox column:
  - `w-12` with a sr-only "Select" header;
  - row boxes labeled "Select {name}", the header box "Select all surveys on this page" (indeterminate on partial selection);
  - the same checkbox on each item of the stacked list.
- Selection:
  - client state, current page only, reset when filters or the page change;
  - with 1+ selected, the toolbar shows "{count} selected" (polite live region), **Activate**, **Move to draft**, **Delete** (destructive) and **Clear selection**.
- Bulk actions:
  - `setSurveysActive(scope, ids, isActive)` service + action, all or nothing: activating checks `active + selected drafts ≤ 5` and returns `ACTIVE_LIMIT` otherwise; unknown or deleted ids return `NOT_FOUND` with no change;
  - bulk delete through an `AlertDialog` ("Delete {count} surveys? Their responses are kept.") and a `deleteSurveys(ids)` soft-delete action.
- Row menu (`SurveyRowMenu`):
  - ghost `MoreHorizontalIcon` trigger with `aria-label` "Actions for {name}", `align="end"`;
  - Edit (link), Copy link, Copy code (success toasts), Activate / Move to draft (`setSurveyActive`) with the "{count} of {limit} active" hint, separator, Delete… (opens `DeleteSurveyDialog`);
  - errors as toasts from `surveyForm.errors.*` (`ACTIVE_LIMIT` with `{ limit: 5 }`), success with `surveys.toasts.activated` / `deactivated`.
- Actions and revalidation:
  - new `setSurveyActive`, `setSurveysActive` and `deleteSurveys` with the same `ActionResult` / `toErrorResult`;
  - every survey action (including `createSurvey`, `updateSurvey`, `deleteSurvey`) revalidates `/dashboard` and `/surveys`;
  - the table calls `refresh()` after success, and the server clamps `page`.
- `DeleteSurveyDialog` gets an optional `onDeleted` prop: the form page keeps `router.push("/dashboard")`, the table stays on `/surveys`
- Messages in en/es: `columns.select`, `select.*`, `actions.*`, `toasts.*`, `bulk.*` (plural delete confirmation)

## Notes

- Phase 3 of 4 of the surveys table (spec: `context/features/surveys-table-actions-spec.md`, research: `docs/surveys-table.md` sections 5, 8, 10, 11, 12)
- The checkboxes must be much lighter than the near-black squares in `table-design-view.png`, yet keep a 3:1 boundary (WCAG 1.4.11): `--input` is only 1.28:1 on the card
- `setSurveyActive` does not reuse `updateSurvey`, which needs the whole form and re-merges questions
- The server is the authority on the 5-active limit; the menu hint can be outdated by the time of the click
- No clickable `<tr>`: the name link, the checkbox and the menu are the row's interactive elements
- Phase 1 already provides `publicUrl` and `activeCount` in the list result
- The 7 "Borrador de prueba" drafts in memory (until `yarn dev` restarts) can be used to test activate / delete without touching the seeded surveys
- Not in this phase: final responsive / dark / keyboard pass and the pager scroll / live region details (phase 4)
- Adjusted during implementation:
  - **Indeterminate icon:** the shared `checkbox.tsx` got one marked local change, a `MinusIcon` for the indeterminate state (the registry only renders a check). The light table styles live in `SurveyCheckbox`.
  - **Row props:** `RowControls` (`row-controls.ts`) carries the selection and menu props shared by the table and the stacked list.
  - **Selection key:** selection is keyed by the list URL (`buildSurveysHref(params)`), so a filter, range or page change starts empty, and deleted rows drop out on their own.
  - **Filters hidden while selecting:** the bulk bar replaces the Type / Status menus (the search stays), as in the research. Clearing the selection brings them back.
  - **Bulk bar layout:** on narrow cards, the count and clear go on the first line and the actions below; on wide cards, one line with the search shrinking.
  - **Refresh:** `deleteSurvey` also calls `refresh()`, since the table stays on the page.
  - **Pending hint:** the "{count} of 5 active" hint only shows for drafts (Activate).
- Fixed in review:
  - **Validation:** the new actions validate their client input (ids: 1 to `SURVEYS_PAGE_SIZE` strings; `isActive` boolean) and return `VALIDATION` otherwise.
  - **Bulk count:** `setSurveysActive` returns only the surveys whose status changed, so "1 survey activated" stays true when the selection mixes an active survey with a draft.
- Added on request: rows per page.
  - The table defaults to 5 rows per page, with a "Rows per page" select (5, 10, 25, 50) next to the pager.
  - It is written to the URL as `?size=` (omitted at 5); changing it resets `page`, and unknown values fall back to 5.
  - The pager is always shown, as in the reference, with disabled arrows when there is one page.
  - `SURVEYS_PAGE_SIZE` became `PAGE_SIZE_OPTIONS` / `DEFAULT_PAGE_SIZE` / `MAX_PAGE_SIZE`; bulk actions accept up to `MAX_PAGE_SIZE` ids.
  - `docs/surveys-table.md` is updated.
- Verification:
  - `yarn lint` (with the `control-border` pairs), `tsc` and `yarn build` pass;
  - checkboxes are a light grey-pink outline at rest in both themes and pink when checked, select all goes indeterminate, the focus ring is solid;
  - with 5 active, "Activate" on a draft (row or bulk) shows the limit toast and changes nothing; after "Move to draft" activating works; the dashboard reflects every change;
  - single and bulk delete remove the rows and stay on `/surveys`; deleting from the form still goes to `/dashboard`;
  - selection clears on filter or page change;
  - keyboard: checkbox → name → menu per row, the menu with arrows / Enter / Escape and focus return, the dialogs trap focus;
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
- **Surveys Table Filters** (2026-10-14): phase 2 of 4. URL state on `/surveys` (`q`, `type`, `status`, `range`, `page`) via `list-params.ts`; server-side search (accent and case insensitive), category and Active / Draft filters, sort and pagination by 10 with clamping. Toolbar with debounced search and Type / Status menus; pager with real pages only and a live "Showing X–Y of Z" text; no-results state with "Clear filters" keeping the range. Shared `useUrlSearch` hook (also on the dashboard) and a fix so a filter or range picked while typing is never undone
