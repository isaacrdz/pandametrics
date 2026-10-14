# Current Feature: Landing Polish

## Status

In Progress

## Goals

- `MobileNav` (client) in `src/components/landing/`:
  - below `md`, a menu button (`aria-label` from `landing.nav.menu`, new key in en/es) opens a `Sheet`;
  - the sheet holds the section links, the `LanguageSwitcher`, "Sign in" and "Create account";
  - it closes when a link is clicked, and focus returns to the menu button.
- `LandingNav` below `md` shows only `Logo` + `MobileNav`: inline links and auth buttons hidden, and the wordmark no longer truncated ("Panda…")
- Responsive layout:
  - `< md`:
    - hero stacked (text first, visual full width), headline ~44px, CTAs full width;
    - feature and step cards stacked;
    - the CTA banner stacks the button under the text;
    - footer lines stacked and centered.
  - `md – lg`: nav links visible, hero still stacked with a wider visual
  - `≥ lg`: two-column hero as in the screenshot
  - No horizontal overflow at 375, 500, 768 and 1280px
- "Skip to content" link: the first focusable element, visible on focus, jumps to `<main id="content">`
- Landmarks: `header`, `nav` with an accessible name, `main`, `footer`; one `h1`, an `h2` per section, an `h3` per card
- Focus rings visible on every link and button (pink `--ring`, at least 3:1 on its background)
- Decorative images and icons `aria-hidden`; the stat card announced through its single `aria-label`
- Any animation only under `motion-safe:`; smooth scroll only with `prefers-reduced-motion: no-preference`
- Dark mode:
  - plum surfaces, and the `brand` panel stays pink;
  - the hero frame uses `--card` and the feature cards use `--accent`;
  - the CTA banner uses `--inverse` with a `--card-border` border.
- Any new landing-only color pair added to `scripts/check-contrast.mjs`

## Notes

- Phase 4 of 4 of the landing work (spec: `context/features/landing-polish-spec.md`, details in `docs/landing.md` section 9)
- Reuse `src/components/ui/sheet.tsx` (shadcn, Radix: focus trap, Escape, focus return) and `src/components/layout/LanguageSwitcher.tsx`
- The landing has no theme toggle: it keeps the user's choice, light by default
- Known starting point from phase 3:
  - the nav truncates the wordmark on mobile;
  - section links are hidden below `md` with no menu;
  - smooth scroll is already gated by reduced motion in `globals.css`;
  - the stat card already has `role="img"` with one `aria-label`.
- Adjusted during implementation: at `md – lg` the nav shows the logo, the section links and the menu button; the language switcher and account buttons move to the sheet until `lg`, because at 768px they truncated the wordmark and wrapped "How it works"
- Verification:
  - `yarn lint`, `tsc` and `yarn build` pass;
  - screenshots at 375, 768 and 1280px in light, dark, English and Spanish, compared with `context/screenshots/landing-view*.png`;
  - mobile menu works with the keyboard (Enter / Escape, focus trap and return), and its links scroll to their sections and close it;
  - tab order: skip link → logo → nav links → language switcher → auth buttons → hero CTAs;
  - no horizontal scroll and no console errors.

## History

<!-- Keep this updated. Earliest to latest -->

- **Init Project** (2026-10-13): cleaned the Create Next App boilerplate (index only shows an `h1` with "Panda Metrics"), moved `app/` to `src/app/` with `@/*` → `./src/*`, light theme by default with a `.dark` class, Geist font applied, removed boilerplate SVGs, new README, ignored `.claude/settings.local.json`, and connected `origin` to `git@github.com:Ellyonsoft/panda-metrics.git`
- **Dashboard View** (2026-10-13): shadcn/ui (Nova, Radix, Lucide) with Panda Metrics theme tokens, `next-themes` (light default) and sonner; app shell with collapsible sidebar (Dashboard, Encuestas, Historial, Configuración) and top bar; `/` redirects to `/dashboard`; stat cards (Respuestas totales, Encuestas activas, Respuestas hoy), search and date range in the URL inside `Suspense`, skeletons and empty states; survey cards with question carousel and Satisfaction / Rating / Poll charts, icon buttons to copy link, copy code and edit; data from `src/lib/mock-data.ts` through `src/lib/dashboard.ts`
- **Internationalization** (2026-10-13): next-intl without URL routing; language in `localStorage` (`panda-metrics:locale`, English default, Spanish) read by a client `LocaleProvider`, inline head script that hides the page until a non-default language is applied, remount on the first locale divergence to avoid hydration mismatches in streamed Suspense boundaries; server renders English, translated text in Client Components; all copy in `src/messages/{en,es}.json` with ICU plurals, formatting through `useFormatter` (`en-US` / `es-MX`); `LanguageSwitcher` with SVG flags in the top bar; `react/jsx-no-literals` and message key parity check in `yarn lint`
- **Survey Form** (2026-10-13): `/surveys/new` and `/surveys/[id]` share one `SurveyForm` (only `FORM_MODES` knows create vs. edit); Zod 4 schema with per-category rules and message-key errors; category picker locked when the survey has responses; per-category editors (unique reactions with label and color, generated rating stars, 2–5 poll options) with counters and limits; Server Actions returning error codes; in-memory survey store (`src/lib/surveys/service.ts`) with the future Prisma API (merge by id, archiving by omission, 5-active limit, soft delete) read by the dashboard; share panel (SVG QR, PNG download, link and code copy, created at / by), delete with confirmation, unsaved changes dialog and `beforeunload`, 500px and dark mode checked
- **Brand Tokens** (2026-10-13): rebranded the theme to the logo pink; light primary `#a85569` (logo hue darkened for AA), dark mode on plum-brown surfaces with the logo pink `#db8396` as primary and dark-brown text; new `--brand` and `--inverse` tokens, `--highlight` follows the primary; survey data, status and destructive colors unchanged; `scripts/check-contrast.mjs` in `yarn lint`; `StatCard` highlight text at full opacity; landing research and 4 phase specs
- **Logo Assets** (2026-10-13): `scripts/brand-assets.mjs` (sharp) generates the app icon, Apple icon, logo tile, hero illustration and Open Graph / Twitter images from `design/logo-source.png` (losslessly recompressed to 9 MB); default favicon replaced; `metadataBase` from `PANDA_PUBLIC_URL`; `Logo` component in the sidebar (icon only when collapsed)
- **Landing Page** (2026-10-13): public landing at `/` in a static `(marketing)` route group (redirect removed); nav with logo, section links, language switcher and account CTAs (to `/dashboard` via `LANDING_LINKS`); hero with panda illustration and accessible illustrative stat card; features, new "How it works" section, dark CTA banner and footer; copy fixed and translated (`landing` namespace); metadata and `themeColor`; contrast checks for the new pairs
