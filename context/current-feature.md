# Current Feature: Brand Tokens

## Status

In Progress

## Goals

- `src/app/globals.css` light and dark values replaced with the token table in `docs/landing.md` section 3:
  - primary `#a85569` (light) / `#db8396` with `#210a10` text (dark);
  - backgrounds `#fdf8f9` (light) and `#1d1418` / `#261b20` / `#33252b` (dark);
  - accent, muted, border, ring, card-border, sidebar and chart values from the table.
- New tokens exposed in `@theme inline`: `--brand` (`#db8396`, surfaces only) and `--inverse` / `--inverse-foreground`
- `--highlight` follows the primary (highlight card, "New survey" button, sidebar logo tile turn pink)
- Unchanged: `--success*`, `--reaction-*`, `--star*`, `--destructive`, `sky-*` info alerts
- `scripts/check-contrast.mjs`:
  - covers the token pairs of both themes;
  - fails when text pairs are below 4.5:1 or UI / ring pairs below 3:1;
  - runs in `yarn lint`.
- Docs: `context/project-overview.md` section 11 (brand palette, what follows the brand and what does not) and the tokens in `docs/dashboard.md` section 5
- `yarn lint`, `tsc`, `yarn build` pass
- Before / after screenshots of the dashboard, survey form (create, edit with share panel), a dialog and a toast, in light and dark

## Notes

- Spec: `context/features/brand-tokens-spec.md`. Research: `docs/landing.md` (sections 1 and 3: token inventory, contrast tables, scale)
- Phase 1 of 4 of the landing work (next: `logo-assets-spec.md`, `landing-page-spec.md`, `landing-polish-spec.md`); one feature per phase for clean commits
- Logo colors: pink `#db8396`, dark brown `#210a10`, cream `#f1ecdb`. White text on the logo pink is only 2.73:1, so the logo pink is `--brand` (never under text) and `--primary` is `#a85569` (5.04:1 with white, 4.79:1 as text on the background, 4.56:1 on the accent)
- Every component already uses tokens; the only hard-coded colors are the flags, the QR and the `sky-*` info alerts. If a component needs a change, note why
- Take the "before" screenshots before touching `globals.css`
- Component change found in review: `StatCard` drew its label and hint at 85% / 70% opacity on the highlight card (4.14:1 on the new pink); they now use the full `highlight-foreground` (5.04:1). The decorative icon keeps 85% (non-text, above 3:1)
- Out of scope: logo assets and the `Logo` component (phase 2), the landing page (phase 3)

## History

<!-- Keep this updated. Earliest to latest -->

- **Init Project** (2026-10-13): cleaned the Create Next App boilerplate (index only shows an `h1` with "Panda Metrics"), moved `app/` to `src/app/` with `@/*` → `./src/*`, light theme by default with a `.dark` class, Geist font applied, removed boilerplate SVGs, new README, ignored `.claude/settings.local.json`, and connected `origin` to `git@github.com:Ellyonsoft/panda-metrics.git`
- **Dashboard View** (2026-10-13): shadcn/ui (Nova, Radix, Lucide) with Panda Metrics theme tokens, `next-themes` (light default) and sonner; app shell with collapsible sidebar (Dashboard, Encuestas, Historial, Configuración) and top bar; `/` redirects to `/dashboard`; stat cards (Respuestas totales, Encuestas activas, Respuestas hoy), search and date range in the URL inside `Suspense`, skeletons and empty states; survey cards with question carousel and Satisfaction / Rating / Poll charts, icon buttons to copy link, copy code and edit; data from `src/lib/mock-data.ts` through `src/lib/dashboard.ts`
- **Internationalization** (2026-10-13): next-intl without URL routing; language in `localStorage` (`panda-metrics:locale`, English default, Spanish) read by a client `LocaleProvider`, inline head script that hides the page until a non-default language is applied, remount on the first locale divergence to avoid hydration mismatches in streamed Suspense boundaries; server renders English, translated text in Client Components; all copy in `src/messages/{en,es}.json` with ICU plurals, formatting through `useFormatter` (`en-US` / `es-MX`); `LanguageSwitcher` with SVG flags in the top bar; `react/jsx-no-literals` and message key parity check in `yarn lint`
- **Survey Form** (2026-10-13): `/surveys/new` and `/surveys/[id]` share one `SurveyForm` (only `FORM_MODES` knows create vs. edit); Zod 4 schema with per-category rules and message-key errors; category picker locked when the survey has responses; per-category editors (unique reactions with label and color, generated rating stars, 2–5 poll options) with counters and limits; Server Actions returning error codes; in-memory survey store (`src/lib/surveys/service.ts`) with the future Prisma API (merge by id, archiving by omission, 5-active limit, soft delete) read by the dashboard; share panel (SVG QR, PNG download, link and code copy, created at / by), delete with confirmation, unsaved changes dialog and `beforeunload`, 500px and dark mode checked
