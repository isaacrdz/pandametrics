# Current Feature: Logo Assets

## Status

In Progress

## Goals

- `scripts/brand-assets.mjs` with `sharp` (v0.35, installed through Next), run once, outputs committed:
  - `src/app/icon.png` 512×512 and `src/app/apple-icon.png` 180×180 from the square crop `left 1844, top 154, 1816×1816` (panda head on pink);
  - `src/assets/brand/logo-icon.webp` 128×128 (same crop) for the logo tile;
  - `src/assets/brand/panda-hero.webp` 1200 wide from `left 1706, top 92`, 2092 wide, cut above the "PANDA" letters (~0.62 of the height);
  - `src/app/opengraph-image.png` and `src/app/twitter-image.png` 1200×630, plus their `.alt.txt` files.
- Script header explains where the source lives and how to rerun it
- 14.7 MB source moved to `design/logo-source.png`; `src/lib/media/` removed
- `src/components/brand/Logo.tsx` (no `'use client'`):
  - static import of `logo-icon.webp` in a rounded `bg-brand` tile;
  - "Panda Metrics" wordmark from a brand constant;
  - props `showWordmark`, `href`, `size` (sidebar / nav), `className`;
  - `alt=""` with the wordmark, `alt="Panda Metrics"` without it.
- `AppSidebar` uses `Logo` (`href="/dashboard"`) instead of the sparkles tile; only the icon when collapsed
- `yarn lint`, `tsc`, `yarn build` pass; build lists the icon and Open Graph routes
- `<head>` has the icon, apple-touch-icon, `og:image` (1200×630) and `og:image:alt`; the tab shows the panda favicon
- No file under `src/` larger than 1 MB; sidebar checked expanded and collapsed, light and dark

## Notes

- Spec: `context/features/logo-assets-spec.md`. Research: `docs/landing.md` section 4 (crops, sizes and weights measured on the real source)
- Phase 2 of 4 of the landing work; requires phase 1 (`--brand` token, done)
- Next.js limits: `opengraph-image` over 8 MB and `twitter-image` over 5 MB fail the build (the source is 14.7 MB)
- Next.js 16: `next/image` `priority` is deprecated (`preload`, or `fetchPriority="high"` for the LCP image). The hero image is generated here but used in phase 3
- Static imports give `next/image` the width, height and blur placeholder; `public/` is not needed
- The current `favicon.ico` (Next default) in `src/app/` is replaced or removed so the panda icon wins
- Brand name "Panda Metrics" is the same in every language: keep it in a constant (passes `react/jsx-no-literals`)
- Check the crops visually before committing (the icon should show the whole head; the hero should not show the letters)
- Added during implementation (not in the spec):
  - `sharp` as an explicit dev dependency (the script should not rely on Next's transitive copy);
  - `metadataBase` from `PANDA_PUBLIC_URL` in the root `generateMetadata`, so the Open Graph / Twitter image URLs are absolute (the build warned and fell back to `http://localhost:3000`);
  - `.alt.txt` files written without a trailing newline (Next uses the content verbatim).
- Decided in review: the source is committed losslessly recompressed (`design/logo-source.png`, 9 MB instead of 14.7 MB, identical pixels) and the assets regenerated from it; the sidebar wordmark reads "Panda Metrics"

## History

<!-- Keep this updated. Earliest to latest -->

- **Init Project** (2026-10-13): cleaned the Create Next App boilerplate (index only shows an `h1` with "Panda Metrics"), moved `app/` to `src/app/` with `@/*` → `./src/*`, light theme by default with a `.dark` class, Geist font applied, removed boilerplate SVGs, new README, ignored `.claude/settings.local.json`, and connected `origin` to `git@github.com:Ellyonsoft/panda-metrics.git`
- **Dashboard View** (2026-10-13): shadcn/ui (Nova, Radix, Lucide) with Panda Metrics theme tokens, `next-themes` (light default) and sonner; app shell with collapsible sidebar (Dashboard, Encuestas, Historial, Configuración) and top bar; `/` redirects to `/dashboard`; stat cards (Respuestas totales, Encuestas activas, Respuestas hoy), search and date range in the URL inside `Suspense`, skeletons and empty states; survey cards with question carousel and Satisfaction / Rating / Poll charts, icon buttons to copy link, copy code and edit; data from `src/lib/mock-data.ts` through `src/lib/dashboard.ts`
- **Internationalization** (2026-10-13): next-intl without URL routing; language in `localStorage` (`panda-metrics:locale`, English default, Spanish) read by a client `LocaleProvider`, inline head script that hides the page until a non-default language is applied, remount on the first locale divergence to avoid hydration mismatches in streamed Suspense boundaries; server renders English, translated text in Client Components; all copy in `src/messages/{en,es}.json` with ICU plurals, formatting through `useFormatter` (`en-US` / `es-MX`); `LanguageSwitcher` with SVG flags in the top bar; `react/jsx-no-literals` and message key parity check in `yarn lint`
- **Survey Form** (2026-10-13): `/surveys/new` and `/surveys/[id]` share one `SurveyForm` (only `FORM_MODES` knows create vs. edit); Zod 4 schema with per-category rules and message-key errors; category picker locked when the survey has responses; per-category editors (unique reactions with label and color, generated rating stars, 2–5 poll options) with counters and limits; Server Actions returning error codes; in-memory survey store (`src/lib/surveys/service.ts`) with the future Prisma API (merge by id, archiving by omission, 5-active limit, soft delete) read by the dashboard; share panel (SVG QR, PNG download, link and code copy, created at / by), delete with confirmation, unsaved changes dialog and `beforeunload`, 500px and dark mode checked
- **Brand Tokens** (2026-10-13): rebranded the theme to the logo pink; light primary `#a85569` (logo hue darkened for AA), dark mode on plum-brown surfaces with the logo pink `#db8396` as primary and dark-brown text; new `--brand` and `--inverse` tokens, `--highlight` follows the primary; survey data, status and destructive colors unchanged; `scripts/check-contrast.mjs` in `yarn lint`; `StatCard` highlight text at full opacity; landing research and 4 phase specs
