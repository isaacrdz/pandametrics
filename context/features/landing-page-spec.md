# Landing Page Spec

## Overview

Phase 3 of 4 of the landing work. Build the public landing at `/` from the screenshots:

- nav;
- hero with the panda illustration and a floating stat card;
- features;
- a new "How it works" section;
- the dark CTA banner;
- the footer.

`/` stops redirecting to `/dashboard`. The page is fully static and all copy is in English and Spanish. Requires phase 1 (brand tokens) and phase 2 (`Logo`, hero image, icons). Full research, copy table and component list in `docs/landing.md` (sections 2, 5–8).

## Decisions (from the research)

- **Route group** `(marketing)` with its own layout (no sidebar, no top bar); delete `src/app/page.tsx` (two groups cannot both define `/`)
- **Fully static**: no cookies, headers, params, search params or server clock (the footer year comes from a constant or the client)
- **Copy fixes**: "surveys" instead of "collections"; features mention faces, stars or your own options (no open questions)
- **Nav links**: "Features" and "How it works" only (no "Pricing" until plans exist)
- **Auth CTAs** ("Sign in", "Create account", "Start for free", "Create my account") link to `/dashboard` through one `LANDING_LINKS` constant until Auth.js exists. "Learn more" scrolls to `#features`
- **Hero stat card**: illustrative static numbers (`2,486`, `+18.4%`, 10 bar heights in a constant), not the mock data
- **Language switcher**: reuse `LanguageSwitcher` in the landing nav
- **SEO**: English HTML only for now (server renders English); noted as an open decision in the overview

## Requirements

### Routes and layout

- `src/app/(marketing)/layout.tsx`: `LandingNav`, `<main id="content">`, `LandingFooter`, very light pink background with a soft `brand` radial glow at the top
- `src/app/(marketing)/page.tsx`: `Hero`, `FeaturesSection`, `HowItWorksSection`, `CtaBanner`
- `export const metadata` (title "Panda Metrics: understand your customers", description) and `export const viewport = { themeColor: "#db8396" }`
- `yarn build` lists `/` as static (○)

### Components (`src/components/landing/`)

- `landing-links.ts`: `LANDING_LINKS` (`signIn`, `signUp`, `start` → `/dashboard`), section ids
- `LandingNav` (client):
  - sticky with a translucent background;
  - `Logo` (`href="/"`), links to `#features` and `#how-it-works`;
  - `LanguageSwitcher`, "Sign in" (primary text), "Create account" (filled).
- `Hero` (client):
  - pill badge (green dot);
  - `h1` headline (~72–80px desktop, tight leading);
  - subtitle;
  - "Start for free →" (filled, pink shadow) and "Learn more" (white);
  - two check items.
- `HeroVisual` (client):
  - white rounded frame with a `bg-brand` panel;
  - `next/image` of `panda-hero.webp` with `fetchPriority="high"`, `sizes`, `alt=""`;
  - floating stat card with label, number and growth chip formatted with `useFormatter`, and 10 bars (`aria-hidden`);
  - the card has `role="img"` and an `aria-label` from `landing.hero.statDescription`.
- `FeaturesSection` + `FeatureCard` (client):
  - `id="features"`, eyebrow, title;
  - 3 cards (`bg-accent/60 border-card-border`) with sparkles, bar chart and star icon tiles.
- `HowItWorksSection` (client): `id="how-it-works"`, eyebrow, title, 3 numbered steps (create, share by link / QR / kiosk, read results)
- `CtaBanner` (client): `bg-inverse text-inverse-foreground` rounded block, eyebrow in `pink-300`, headline, white button "Create my account →" with `text-primary`
- `LandingFooter` (client): divider, "© {year} Panda Metrics" and the tagline
- Anchor sections use `scroll-mt-24`; smooth scrolling only under `prefers-reduced-motion: no-preference`

### Messages

- `landing` namespace in `src/messages/en.json` and `es.json` with the full key list in `docs/landing.md` section 6 (nav, hero, features, how it works, CTA, footer)
- Same keys in both files (`yarn lint`), no literals in JSX

### Docs

- `context/project-overview.md`:
  - routes: `/` is the public landing;
  - structure: `(marketing)` group;
  - open decisions: Spanish SEO for the marketing pages.

## Verification

- `yarn lint`, `tsc` and `yarn build` pass; `/` is static (○); no `blocking-*` warnings in dev
- `/` shows the landing (no redirect); `/dashboard` and the survey pages are unchanged
- Desktop (1280px) matches `landing-view.png`, `landing-view-2.png` and `landing-view-3.png`, with the copy fixes and the extra "How it works" section
- Nav links scroll to their sections below the sticky nav; "Learn more" scrolls to features; auth CTAs open `/dashboard`
- Switching to Spanish translates every string in place; English is the server-rendered HTML
- `<head>` has the title, description, `theme-color`, icons and Open Graph image
- Hero image loads with high priority and no layout shift; no console errors

## References

- @docs/landing.md
- @context/screenshots/landing-view.png
- @context/screenshots/landing-view-2.png
- @context/screenshots/landing-view-3.png
- @src/app/page.tsx
- @src/app/layout.tsx
- @src/components/layout/LanguageSwitcher.tsx
- @src/messages/en.json
- @context/project-overview.md
- `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-viewport.md`
