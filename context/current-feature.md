# Current Feature: Hide Dev Indicator

## Status

In Progress

## Goals

- `next.config.ts` sets `devIndicators: false` inside the existing `NextConfig` object (still wrapped by `withNextIntl`), with a short comment that errors still open the overlay and that static vs dynamic is checked in the `yarn build` route table (`○` / `◐` / `ƒ`)
- The leftover `/* config options here */` boilerplate comment is removed
- After restarting `yarn dev`, there is no floating Next.js "N" button at 375px or 1280px on `/` or `/dashboard`
- A temporary runtime error in a Client Component still opens the Next.js error overlay (then reverted)
- `yarn lint`, `tsc` and `yarn build` pass, and the build route table is unchanged

## Notes

- No spec: loaded inline from the research in `docs/dev-indicator.md` (prompt: `context/research/dev-indicator-research.md`)
- Hide instead of move: no corner is free in both layouts.
  - Bottom-left covers the landing hero and the sidebar.
  - Bottom-right is taken by the sonner `Toaster`.
  - Top corners sit over the nav and the top bar.
- Committed for the whole team, not per developer (no env var)
- Only `next.config.ts` changes: no components, messages, tokens or routes. The indicator never ships in production.
- v16 removed `appIsrStatus`, `buildActivity` and `buildActivityPosition`; none are used. `experimental.agentFeedback` is unrelated and stays as is.
- Next.js restarts the dev server when `next.config.ts` changes; if the button is still visible, restart `yarn dev` by hand and hard-refresh the tab

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
