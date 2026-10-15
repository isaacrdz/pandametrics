# Logo and Surfaces Phase 2 — Surfaces Spec

## Overview

Change the surface theme following the reference survey card: cards white and the page (paper) a light cool gray, with neutral borders and fills. Dark mode changes the same way: neutral dark page with cards one step lighter. Primary buttons, pink accents, satisfaction faces and survey data colors do not change.

Full research in `docs/logo-and-surfaces.md` (sections 3 and 4).

## Decisions (from the research)

- Page `#f1f3f7`, cards `#ffffff`.
- Dark mode neutralized to match (no more plum-brown surfaces).
- Token changes only: no component edits. A card shadow is decided afterwards by looking at the result (out of scope).
- Stays pink: `--primary`, `--ring`, `--brand`, `--highlight`, `--accent`, `--accent-foreground`, `--sidebar-accent*`, `--sidebar-primary*`, `--inverse` (dark), charts, reactions, stars, success, destructive.

## Requirements

### Light tokens (`:root` in `src/app/globals.css`)

| Token | Today | New |
| --- | --- | --- |
| `--background` | `#fdf8f9` | `#f1f3f7` |
| `--card`, `--popover`, `--sidebar` | `#ffffff` | unchanged |
| `--card-border` | `#fcccd5` | `#e4e7ed` |
| `--border`, `--input`, `--sidebar-border` | `#efdfe4` | `#e4e7ed` |
| `--muted`, `--secondary` | `#f7eef0` | `#f3f4f7` |
| `--muted-foreground` | `#6e5d63` | `#5b6170` |
| `--foreground`, `--control-border` | — | unchanged (`#a08089` passes 3:1 on the new page; a neutral of the same lightness does not) |

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

### Contrast

- `scripts/check-contrast.mjs` must pass with no changes to its pairs. Expected: light muted text 5.58 on page / 6.20 on card, pink text 4.54 on page; dark muted text 8.29 / 7.50, pink text 6.76 / 6.12, control border 4.28 on card.
- Add a pair `destructive` on `background` only if destructive text is found on the page background (light would be 4.35, below 4.5); today it is only used on cards.

### Hardcoded tints

- Search for hardcoded pink colors outside the tokens (`#fdf8f9`, `#fcccd5`, `#efdfe4`, `#f7eef0`, `#1d1418`, `#261b20`, `rgb(255 228 236`) and replace them with tokens where they are surfaces. Survey data colors and the brand pink stay.

## Verification

- `yarn lint` (contrast and messages), `tsc --noEmit`, `yarn build`.
- Screenshots at 375 / 768 / 1280, light and dark, English: dashboard, surveys list, survey form (with the share panel), users list, new and edit user, profile, landing.
  - Light: white cards clearly separate from the gray page; neutral borders, inputs and pills; active sidebar item, number tiles and badges still pink.
  - Dark: cards one step lighter than the page; no plum surfaces left.
  - Faces, stars, poll colors and primary buttons look exactly as before.
- No horizontal overflow introduced.

## References

- @docs/logo-and-surfaces.md
- @src/app/globals.css
- @scripts/check-contrast.mjs
