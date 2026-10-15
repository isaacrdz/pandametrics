# Logo and Surfaces

## Output

`docs/logo-and-surfaces.md`

## Research

Document two visual changes:

1. **New logo** `design/logo.svg` (the panda in a hoodie, vector, transparent background) used as the **favicon** and as the **sidebar icon**, replacing the current pink tile cropped from `design/logo-source.png`.
2. **New surface theme** based on the reference image (survey results card): **cards white, the page (paper) a light cool gray**, neutral borders. The satisfaction faces and their colors do not change, and the **primary color of buttons stays** as it is for now.

The result must be detailed enough to write one or two feature specs.

## Include

Current state:

- Brand assets: `scripts/brand-assets.mjs` crops `design/logo-source.png` into `src/app/icon.png` (512), `src/app/apple-icon.png` (180), `src/assets/brand/logo-icon.webp` (128, used by `Logo`), the hero and the Open Graph images.
- `Logo` component (sidebar and landing nav): pink rounded tile (`bg-brand`) with the webp, wordmark next to it, `size-8`→`size-10` in the collapsed rail.
- `design/logo.svg`: viewBox, size, number of paths, fixed width / height, `preserveAspectRatio`, stray specks; how it renders (preview).
- Theme tokens in `src/app/globals.css` (light and dark): background, card, borders, muted, secondary, sidebar, `card-border`, accent; which are pink-tinted today.
- Reference image colors (sampled): page, card, card edge, bar track, divider.
- Contrast pairs in `scripts/check-contrast.mjs`.

What to define:

- How to prepare the SVG (square viewBox, attributes, optimization, size) and which files it produces: `icon.svg`, PNG fallbacks, `apple-icon.png` (iOS needs an opaque PNG), and what happens to `logo-icon.webp`, the hero and the OG images.
- How `Logo` renders the SVG (static import, `next/image` and SVG), with or without the pink tile, sizes in the sidebar, collapsed rail and landing nav, accessible name.
- The new light surface palette (exact token values), what stays pink (primary, accent tints, brand, active nav), contrast checks, card shadow or border.
- The dark theme neutralized the same way (neutral dark page, one step lighter cards, neutral borders), with contrast checks.
- Decisions: sidebar icon is the panda alone (no tile), `apple-icon.png` on the brand pink, page `#f1f3f7`, dark mode changes to match.
- Every place that uses pink surfaces or `card-border` and how it looks after the change.
- Verification and phases.

## Sources

- @design/logo.svg
- @scripts/brand-assets.mjs
- @src/components/brand/Logo.tsx
- @src/components/layout/AppSidebar.tsx
- @src/app/globals.css
- @scripts/check-contrast.mjs
- @docs/landing.md
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/app-icons.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md` (SVG)
