# Logo Assets Spec

## Overview

Phase 2 of 4 of the landing work. Turn the 14.7 MB logo (`src/lib/media/logo.png`, 5504×3072) into optimized assets. The assets cover:

- the app icons (favicon, Apple touch icon);
- the Open Graph / Twitter images;
- a logo tile;
- the hero illustration.

Then add a shared `Logo` component that replaces the purple sparkles tile in the admin sidebar. Crops, sizes and weights were measured in `docs/landing.md` section 4. Requires phase 1 (`--brand` token).

## Requirements

### Generation script

- `scripts/brand-assets.mjs` using `sharp` (already installed through Next, v0.35); run once and commit its outputs:
  - **App icon**: square crop `left 1844, top 154, 1816×1816` (panda head on pink) → `src/app/icon.png` 512×512 (~134 KB)
  - **Apple icon**: same crop → `src/app/apple-icon.png` 180×180 (~20 KB)
  - **Logo tile**: same crop → `src/assets/brand/logo-icon.webp` 128×128 (~3 KB)
  - **Hero illustration**: crop starting at `left 1706, top 92`, 2092 wide, cut just above the "PANDA" letters (~0.62 of the image height) → `src/assets/brand/panda-hero.webp` 1200 wide (~50 KB)
  - **Open Graph / Twitter**: full logo → 1200×630 cover → `src/app/opengraph-image.png` and `src/app/twitter-image.png` (~370 KB each, well under the 8 MB / 5 MB limits)
- `src/app/opengraph-image.alt.txt` and `src/app/twitter-image.alt.txt`: "Panda Metrics logo: a panda in a hoodie on a pink background"
- Header comment in the script: where the source lives and how to rerun it
- Move the 14.7 MB source out of `src/` to `design/logo-source.png`, so it is never imported or shipped. Delete `src/lib/media/` if empty

### `Logo` component

- `src/components/brand/Logo.tsx` (no `'use client'`):
  - static import of `logo-icon.webp` through `next/image`, in a rounded tile (`bg-brand`);
  - wordmark "Panda Metrics" from a brand constant (same in every language);
  - props `showWordmark` (default true), `href`, `className`, size variant for the sidebar (32–40 px) and the landing nav (44 px).
- Accessibility: the image has `alt=""` when the wordmark is visible, and `alt="Panda Metrics"` when it is not
- `AppSidebar`:
  - replace the sparkles tile and text with `Logo` (`href="/dashboard"`);
  - in collapsed mode only the icon shows (`group-data-[collapsible=icon]:hidden` on the wordmark).

## Verification

- `yarn lint`, `tsc` and `yarn build` pass; the build output lists `icon.png`, `apple-icon.png`, `opengraph-image.png` and `twitter-image.png`
- The browser tab shows the panda favicon; the HTML `<head>` has `<link rel="icon">`, `<link rel="apple-touch-icon">`, `og:image` (1200×630) and `og:image:alt`
- Sidebar shows the panda tile + "Panda Metrics", expanded and collapsed, light and dark; no layout shift (the image has width and height)
- No file under `src/` is larger than 1 MB (`find src -size +1M` is empty)
- The hero image is not used yet (phase 3), but exists and looks right (the panda with hood and paws, no letters)

## References

- @docs/landing.md
- @src/lib/media/logo.png
- @src/components/layout/AppSidebar.tsx
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/app-icons.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md`
