# Current Feature: Landing Page

## Status

In Progress

## Goals

### Routes and layout

- `src/app/page.tsx` (redirect to `/dashboard`) deleted; `/` is the landing
- `src/app/(marketing)/layout.tsx`: `LandingNav`, `<main id="content">`, `LandingFooter`, very light pink background with a soft `brand` radial glow at the top
- `src/app/(marketing)/page.tsx`: `Hero`, `FeaturesSection`, `HowItWorksSection`, `CtaBanner`; static `metadata` (title, description) and `viewport` with `themeColor: "#db8396"`
- `yarn build` lists `/` as static (○)

### Components (`src/components/landing/`)

- `landing-links.ts`: `LANDING_LINKS` (`signIn`, `signUp`, `start` → `/dashboard`) and section ids
- `LandingNav`: sticky, translucent; `Logo` (`href="/"`), links to `#features` and `#how-it-works`, `LanguageSwitcher`, "Sign in" and "Create account"
- `Hero`: pill badge with a green dot, `h1` (~72–80px desktop), subtitle, "Start for free →" and "Learn more" (scrolls to `#features`), two check items
- `HeroVisual`:
  - white rounded frame with a `bg-brand` panel and `panda-hero.webp` (`next/image`, `fetchPriority="high"`, `sizes`, `alt=""`);
  - floating stat card with illustrative static numbers (`2,486`, `+18.4%`, 10 bars) formatted with `useFormatter`;
  - the bars are `aria-hidden`, and the card has `role="img"` with `aria-label` from `landing.hero.statDescription`.
- `FeaturesSection` + `FeatureCard`: `id="features"`, eyebrow, title, 3 cards (`bg-accent/60 border-card-border`) with sparkles / bar chart / star icon tiles
- `HowItWorksSection`: `id="how-it-works"`, 3 numbered steps (create, share by link / QR / kiosk, read results)
- `CtaBanner`: `bg-inverse text-inverse-foreground` rounded block, pink eyebrow, headline, white button "Create my account →" with `text-primary`
- `LandingFooter`: divider, "© {year} Panda Metrics", tagline
- Sections use `scroll-mt-24`; smooth scrolling only under `prefers-reduced-motion: no-preference`

### Messages and docs

- `landing` namespace in `en.json` and `es.json` with the key list in `docs/landing.md` section 6; same keys in both, no JSX literals
- `context/project-overview.md`: `/` is the public landing (routes), `(marketing)` group (structure), Spanish SEO for marketing pages (open decisions)

### Verification

- `yarn lint`, `tsc`, `yarn build` pass; `/` static; no `blocking-*` warnings
- `/` shows the landing; `/dashboard` and the survey pages unchanged
- Desktop (1280px) matches the three landing screenshots, with the copy fixes and the extra "How it works" section
- Nav links scroll below the sticky nav; "Learn more" scrolls to features; auth CTAs open `/dashboard`
- Spanish switch translates in place; `<head>` has title, description, `theme-color`, icons and Open Graph image
- Hero image loads with high priority, no layout shift, no console errors

## Notes

- Spec: `context/features/landing-page-spec.md`. Research: `docs/landing.md` (sections 2, 5–8: screen description, routing, copy table, components)
- Screenshots: `context/screenshots/landing-view.png`, `landing-view-2.png`, `landing-view-3.png`
- Phase 3 of 4; requires phase 1 (brand tokens, `--brand`, `--inverse`) and phase 2 (`Logo`, `panda-hero.webp`, icons, OG images), both done
- Copy fixes vs. the screenshots: "surveys" instead of "collections"; no "open questions" (faces, stars or your own options); no "Pricing" link; new "How it works" section
- No Auth.js yet: every auth CTA goes to `/dashboard` through `LANDING_LINKS`, one place to change later
- Fully static: no cookies, headers, params, search params or server clock. The footer year comes from a constant or the client (`new Date()` on the server makes the page dynamic under Cache Components)
- Translated text needs Client Components (language in `localStorage`); the server prerenders English, Spanish applies on the client
- Two route groups cannot both define `/`: `src/app/page.tsx` must be deleted
- Next 16: `next/image` `priority` is deprecated; use `fetchPriority="high"` for the hero
- Mobile menu, skip link, full responsive pass and dark-mode polish are phase 4 (`landing-polish-spec.md`); this phase still must not overflow at narrow widths
- Adjusted during implementation and review:
  - hero illustration moved up and extra bottom space so the stat card covers the hoodie, not the face (as in the reference);
  - hero image `loading="eager"` next to `fetchPriority="high"` (Next kept `lazy` otherwise);
  - stat card description uses the same preformatted numbers as the card (`18.4%`, not a rounded `18%`);
  - growth chip on `bg-success/10` (4.53:1; `/15` was 4.32:1);
  - light buttons use `bg-card` instead of white so they keep contrast in dark mode;
  - `scripts/check-contrast.mjs` covers the CTA eyebrow (`brand` on `inverse`) and pink text on card-colored buttons.

## History

<!-- Keep this updated. Earliest to latest -->

- **Init Project** (2026-10-13): cleaned the Create Next App boilerplate (index only shows an `h1` with "Panda Metrics"), moved `app/` to `src/app/` with `@/*` → `./src/*`, light theme by default with a `.dark` class, Geist font applied, removed boilerplate SVGs, new README, ignored `.claude/settings.local.json`, and connected `origin` to `git@github.com:Ellyonsoft/panda-metrics.git`
- **Dashboard View** (2026-10-13): shadcn/ui (Nova, Radix, Lucide) with Panda Metrics theme tokens, `next-themes` (light default) and sonner; app shell with collapsible sidebar (Dashboard, Encuestas, Historial, Configuración) and top bar; `/` redirects to `/dashboard`; stat cards (Respuestas totales, Encuestas activas, Respuestas hoy), search and date range in the URL inside `Suspense`, skeletons and empty states; survey cards with question carousel and Satisfaction / Rating / Poll charts, icon buttons to copy link, copy code and edit; data from `src/lib/mock-data.ts` through `src/lib/dashboard.ts`
- **Internationalization** (2026-10-13): next-intl without URL routing; language in `localStorage` (`panda-metrics:locale`, English default, Spanish) read by a client `LocaleProvider`, inline head script that hides the page until a non-default language is applied, remount on the first locale divergence to avoid hydration mismatches in streamed Suspense boundaries; server renders English, translated text in Client Components; all copy in `src/messages/{en,es}.json` with ICU plurals, formatting through `useFormatter` (`en-US` / `es-MX`); `LanguageSwitcher` with SVG flags in the top bar; `react/jsx-no-literals` and message key parity check in `yarn lint`
- **Survey Form** (2026-10-13): `/surveys/new` and `/surveys/[id]` share one `SurveyForm` (only `FORM_MODES` knows create vs. edit); Zod 4 schema with per-category rules and message-key errors; category picker locked when the survey has responses; per-category editors (unique reactions with label and color, generated rating stars, 2–5 poll options) with counters and limits; Server Actions returning error codes; in-memory survey store (`src/lib/surveys/service.ts`) with the future Prisma API (merge by id, archiving by omission, 5-active limit, soft delete) read by the dashboard; share panel (SVG QR, PNG download, link and code copy, created at / by), delete with confirmation, unsaved changes dialog and `beforeunload`, 500px and dark mode checked
- **Brand Tokens** (2026-10-13): rebranded the theme to the logo pink; light primary `#a85569` (logo hue darkened for AA), dark mode on plum-brown surfaces with the logo pink `#db8396` as primary and dark-brown text; new `--brand` and `--inverse` tokens, `--highlight` follows the primary; survey data, status and destructive colors unchanged; `scripts/check-contrast.mjs` in `yarn lint`; `StatCard` highlight text at full opacity; landing research and 4 phase specs
- **Logo Assets** (2026-10-13): `scripts/brand-assets.mjs` (sharp) generates the app icon, Apple icon, logo tile, hero illustration and Open Graph / Twitter images from `design/logo-source.png` (losslessly recompressed to 9 MB); default favicon replaced; `metadataBase` from `PANDA_PUBLIC_URL`; `Logo` component in the sidebar (icon only when collapsed)
