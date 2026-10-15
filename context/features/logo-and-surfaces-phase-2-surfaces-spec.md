# Logo and Surfaces Phase 2 — Surfaces Spec

## Overview

Change the surface theme following the reference survey card: cards white and the page (paper) a light cool gray, with neutral borders and fills. Dark mode changes the same way: neutral dark page with cards one step lighter. The primary changes from pink to blue `#4263eb` (added on request, see "Blue primary"). Satisfaction faces, survey data colors and the brand pink of the logo do not change.

Full research in `docs/logo-and-surfaces.md` (sections 3 and 4).

## Decisions (from the research)

- Page `#f2f4f8` (planned `#f1f3f7`, one step lighter so the blue primary text passes AA on it), cards `#ffffff`.
- Primary blue `#4263eb` in light and `#748ffc` in dark, with blue accent tints; the brand pink stays on the logo, icons and landing illustrations.
- Dark mode neutralized to match (no more plum-brown surfaces).
- Token changes only: no component edits. A card shadow is decided afterwards by looking at the result (out of scope).
- Stays: `--brand` (pink), `--foreground`, light `--inverse`, charts 3–5, reactions, stars, success, destructive.

## Requirements

### Light tokens (`:root` in `src/app/globals.css`)

| Token | Today | New |
| --- | --- | --- |
| `--background` | `#fdf8f9` | `#f2f4f8` |
| `--card`, `--popover`, `--sidebar` | `#ffffff` | unchanged |
| `--card-border` | `#fcccd5` | `#e4e7ed` |
| `--border`, `--input`, `--sidebar-border` | `#efdfe4` | `#e4e7ed` |
| `--muted`, `--secondary` | `#f7eef0` | `#f3f4f7` |
| `--muted-foreground` | `#6e5d63` | `#5b6170` |
| `--control-border` | `#a08089` | `#858b98` (neutral, 3.10:1 on the page, 3.42:1 on cards) |
| `--foreground` | — | unchanged |

### Dark tokens (`.dark`)

| Token | Today | New |
| --- | --- | --- |
| `--background` | `#1d1418` | `#121418` |
| `--card`, `--popover` | `#261b20` | `#1b1e24` |
| `--sidebar` | `#211719` | `#16191e` |
| `--muted`, `--secondary` | `#33252b` | `#262a31` |
| `--muted-foreground` | `#c2adb4` | `#a8aebb` |
| `--sidebar-foreground` | `#d9c6cc` | `#c9ced8` |
| `--card-border` | `#4a323b` | `#2e323a` |
| `--border`, `--sidebar-border` | `rgb(255 228 236 / 10%)` | `rgb(255 255 255 / 10%)` |
| `--input` | `rgb(255 228 236 / 15%)` | `rgb(255 255 255 / 15%)` |
| `--control-border` | `#8a6b75` | `#7b8190` |
| `--foreground` and the rest | — | unchanged |

### Blue primary (added on request)

| Token | Light | Dark |
| --- | --- | --- |
| `--primary`, `--ring`, `--sidebar-primary`, `--sidebar-ring`, `--chart-1` | `#4263eb` | `#748ffc` |
| `--primary-foreground`, `--sidebar-primary-foreground` | `#ffffff` (light unchanged) | `#0b1220` |
| `--accent`, `--sidebar-accent` | `#f0f4ff` | `#1f2a4d` |
| `--accent-foreground`, `--sidebar-accent-foreground` | `#3b5bdb` | `#bac8ff` |
| `--chart-2` | `#748ffc` | `#91a7ff` |
| `--inverse` | unchanged | `#2a2f38` (neutral, was plum) |

`#4263eb` is kept exact. As text it is 4.48:1 on `#f1f3f7` and 4.45:1 on `#edf2ff`, so the page moves to `#f2f4f8` (4.52) and the accent to `#f0f4ff` (4.53). Dark: blue text 6.21 on the page, 5.63 on cards, 4.73 on the accent; button text 6.31.

### Contrast

- `scripts/check-contrast.mjs` must pass with no changes to its pairs. Expected: light muted text 5.63 on page / 6.20 on card, blue text 4.52 on page / 4.98 on card; dark muted text 8.29 / 7.50, blue text 6.21 / 5.63, control border 4.28 on card.
- Add a pair `destructive` on `background` only if destructive text is found on the page background (light would be 4.35, below 4.5); today it is only used on cards.

### Hardcoded tints

- Search for hardcoded pink colors outside the tokens (`#fdf8f9`, `#fcccd5`, `#efdfe4`, `#f7eef0`, `#1d1418`, `#261b20`, `rgb(255 228 236`) and replace them with tokens where they are surfaces. Survey data colors and the brand pink stay.

## Verification

- `yarn lint` (contrast and messages), `tsc --noEmit`, `yarn build`.
- Screenshots at 375 / 768 / 1280, light and dark, English: dashboard, surveys list, survey form (with the share panel), users list, new and edit user, profile, landing.
  - Light: white cards clearly separate from the gray page; neutral borders, inputs and pills; buttons, links, active sidebar item, number tiles and badges blue.
  - Dark: cards one step lighter than the page; no plum surfaces left.
  - Faces, stars, poll colors and the landing illustration look exactly as before.
- No horizontal overflow introduced.

## References

- @docs/logo-and-surfaces.md
- @src/app/globals.css
- @scripts/check-contrast.mjs
