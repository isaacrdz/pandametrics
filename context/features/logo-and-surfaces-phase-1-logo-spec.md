# Logo and Surfaces Phase 1 — Logo Spec

## Overview

Use the vector panda `design/logo.svg` as the favicon and as the icon of the `Logo` component (sidebar and landing nav), replacing the pink tile cropped from `design/logo-source.png`.

Full research in `docs/logo-and-surfaces.md` (section 2).

## Decisions (from the research)

- **Panda alone, no pink tile** in the sidebar and the landing nav.
- **`apple-icon.png` on the brand pink `#db8396`** (iOS needs an opaque icon).
- **Favicon as SVG** (`src/app/icon.svg`) with a PNG fallback (`src/app/icon.png`), both rendered from the same optimized SVG.
- The landing hero (`panda-hero.webp`) and the Open Graph / Twitter images keep coming from `logo-source.png`; they do not change.

## Requirements

### Clean source

- Remove the stray near-white specks next to the right ear in `design/logo.svg` (tiny white paths outside the head outline) and commit the cleaned source. Check it on a checkerboard and on a dark background.

### SVG pipeline (`scripts/brand-assets.mjs`)

- Add `svgo` as a dev dependency.
- New step that reads `design/logo.svg` and:
  1. sets a square viewBox around the panda (implemented as `-35 40 1968 1968`, tighter than the planned `-86.5 0 2048 2048`);
  2. removes `width`, `height`, `preserveAspectRatio` and `style` from the root `<svg>`;
  3. optimizes with SVGO (`preset-default`, `floatPrecision: 1`), keeping the viewBox;
  4. writes `src/assets/brand/logo.svg` and `src/app/icon.svg`;
  5. renders with `sharp` from the optimized SVG:
     - `src/app/icon.png` 512×512, transparent background;
     - `src/app/apple-icon.png` 180×180, panda centered on `#db8396` with ~12% padding, flattened (no alpha).
- Remove the `logo-icon.webp` output; the HEAD crop is no longer used for icons (keep the HERO and OG steps).
- Log each output with its size; the optimized SVG is expected well under the current 99 KB.

### `Logo` component (`src/components/brand/Logo.tsx`)

- Static import `logoMark from "@/assets/brand/logo.svg"` with `next/image` (Next sets `unoptimized` for `.svg` automatically; no config change).
- Remove the tile styles (`overflow-hidden rounded-xl bg-brand shadow-[...]`). The square box keeps the sizes (`sm` `size-10`, `md` `size-11`) and the image uses `object-contain`.
- Rename `SIZES.*.tile` to `icon` and the comment on `iconClassName` (no tile anymore).
- Accessible name unchanged: `alt=""` with the wordmark, `alt={BRAND_NAME}` when `showWordmark` is false.
- Dark mode: check the panda outline on the dark sidebar; only if the hood edge disappears, add `dark:drop-shadow-[0_0_1px_rgb(255_255_255/0.35)]` to the image.

### Cleanup and docs

- Delete `src/assets/brand/logo-icon.webp`.
- `docs/landing.md`: update the asset table (logo row → `src/assets/brand/logo.svg`, favicon → `icon.svg` + `icon.png`, `apple-icon.png` on pink).

## Verification

- `yarn lint`, `tsc --noEmit`, `yarn build`.
- The HTML `<head>` has `<link rel="icon" type="image/svg+xml" sizes="any">` (icon.svg), the PNG icon link and `apple-touch-icon`.
- `apple-icon.png` is 180×180, opaque, panda on pink; `icon.png` is 512×512 and transparent.
- Sidebar expanded and collapsed (1280px), light and dark: the panda without tile, not stretched, crisp at 40px, centered at 32px in the collapsed rail; the collapsed link is still named "Panda Metrics".
- Landing nav: panda at 44px next to the wordmark.
- No reference to `logo-icon.webp` remains.

## References

- @docs/logo-and-surfaces.md
- @design/logo.svg
- @scripts/brand-assets.mjs
- @src/components/brand/Logo.tsx
- @src/components/layout/AppSidebar.tsx
- @src/components/landing/LandingNav.tsx
- @docs/landing.md
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/app-icons.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md`
