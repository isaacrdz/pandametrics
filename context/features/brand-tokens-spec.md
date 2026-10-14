# Brand Tokens Spec

## Overview

Phase 1 of 4 of the landing work. Rebrand the whole project from purple / indigo to the logo's pink:

- **light mode**: a pink primary derived from the logo;
- **dark mode**: plum-brown surfaces tinted with the same hue.

Every component already uses theme tokens, so the change lives almost entirely in `src/app/globals.css`. Full research, contrast measurements and the token table in `docs/landing.md` (sections 1 and 3).

## Requirements

### Tokens

- Replace the light and dark values in `src/app/globals.css` with the table in `docs/landing.md` section 3 ("Token table"):
  - `--primary` `#a85569` (light) / `#db8396` with `--primary-foreground` `#210a10` (dark);
  - backgrounds `#fdf8f9` (light) and `#1d1418` / `#261b20` / `#33252b` (dark);
  - accent, muted, border, ring, card-border, sidebar and chart values from the table.
- Add new tokens and expose them in `@theme inline`:
  - `--brand` `#db8396` → `--color-brand` (logo pink, surfaces and illustrations only, never under text);
  - `--inverse` / `--inverse-foreground` → `--color-inverse`, `--color-inverse-foreground` (dark CTA banner: `#2b1e24` / white in light, `#3b2830` / `#f6edef` in dark).
- `--highlight` / `--highlight-foreground` follow the primary (the "Total responses" card, "New survey" button and sidebar logo tile turn pink).
- Do **not** change `--success*`, `--reaction-*`, `--star*`, `--destructive` or the `sky-*` info alerts.

### Contrast

- Add `scripts/check-contrast.mjs`: it lists the token pairs from `docs/landing.md` section 3 (text on background, card, accent; primary button text; ring on background) for both themes, and fails when text pairs are below 4.5:1 or ring / UI pairs below 3:1.
- Run it as part of `yarn lint`, next to the message key check.

### Docs

- `context/project-overview.md` section 11 "Visual design system": brand palette (logo pink, primary, dark tone), which colors follow the brand and which do not (survey data, status, destructive)
- `docs/dashboard.md` section 5: replace the purple token values with the new ones (or point to `docs/landing.md`)

## Verification

- `yarn lint` (with the contrast and message checks), `tsc` and `yarn build` pass
- Before / after screenshots at desktop:
  - dashboard;
  - survey form create and edit (with the share panel);
  - a dialog and a toast;
  - the same screens in dark mode.
- What changes:
  - pink: primary buttons, highlight card, carousel dots, poll bars and counts, active nav pill, category picker selection, form section tiles, focus rings;
  - plum-brown: dark mode surfaces.
- What stays the same: reaction faces and bars, stars, "Active" green, delete red, QR (black on white), flags, info alerts
- No component file changes besides `globals.css` (if one is needed, it is because it hard-codes a color: note it)

## References

- @docs/landing.md
- @src/app/globals.css
- @context/project-overview.md
- @docs/dashboard.md
- @src/lib/media/logo.png
