# Landing Polish Spec

## Overview

Phase 4 of 4 of the landing work. Make the landing responsive, accessible and correct in dark mode:

- mobile navigation;
- layouts at phone and tablet widths;
- a skip link and landmarks;
- reduced motion;
- dark mode of every section;
- a final comparison against the reference screenshots.

Requires phase 3 (the landing exists). Details in `docs/landing.md` section 9.

## Requirements

### Mobile navigation

- `MobileNav` (client) in `src/components/landing/`:
  - a menu button below `md` (`aria-label` from `landing.nav.menu`) that opens a `Sheet`;
  - the sheet holds the section links, the language switcher, "Sign in" and "Create account";
  - it closes when a link is clicked, and focus returns to the menu button.
- `LandingNav` hides the inline links and auth buttons below `md` and shows `Logo` + `MobileNav`

### Responsive layout

- `< md`:
  - hero stacked (text first, visual full width), headline ~44px, CTAs full width;
  - feature and step cards stacked;
  - the CTA banner stacks the button under the text;
  - footer lines stacked and centered.
- `md – lg`: nav links visible, hero still stacked with a wider visual
- `≥ lg`: two-column hero as in the screenshot
- No horizontal overflow at 375, 500, 768 and 1280px

### Accessibility

- "Skip to content" link as the first focusable element (visible on focus), jumping to `<main id="content">`
- Landmarks: `header` (nav), `nav` with an accessible name, `main`, `footer`; one `h1`, `h2` per section, `h3` per card
- Focus rings visible on every link and button (pink `--ring`, 3:1 on the background)
- Decorative images and icons `aria-hidden`; the stat card announced with its single `aria-label`
- Any animation (e.g. hero bars growing) only under `motion-safe:`; smooth scroll only with `prefers-reduced-motion: no-preference`

### Dark mode

- Every landing section reads in dark mode:
  - plum surfaces;
  - the `brand` panel stays pink;
  - the hero frame uses `--card`;
  - feature cards use `--accent`;
  - the CTA banner uses `--inverse` with a `--card-border` border so it does not disappear.
- Contrast re-checked with `scripts/check-contrast.mjs` for any new landing-only pair

## Verification

- `yarn lint` (contrast and messages), `tsc` and `yarn build` pass
- Screenshots at 375, 768 and 1280px, light and dark, English and Spanish, compared with `landing-view.png`, `landing-view-2.png` and `landing-view-3.png`
- Mobile menu:
  - opens and closes with the keyboard (Enter / Escape);
  - focus is trapped while open and returns to the button;
  - links scroll to their sections and close the sheet.
- Tab order: skip link → logo → nav links → language switcher → auth buttons → hero CTAs → …; the skip link jumps to the main content
- No horizontal scroll at any tested width; no console errors

## References

- @docs/landing.md
- @context/features/landing-page-spec.md
- @context/screenshots/landing-view.png
- @context/screenshots/landing-view-2.png
- @context/screenshots/landing-view-3.png
- @src/components/ui/sheet.tsx
- @src/components/layout/LanguageSwitcher.tsx
