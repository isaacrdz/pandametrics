# Logo and Surfaces

Two visual changes:

1. The vector panda (`design/logo.svg`) becomes the favicon and the sidebar icon.
2. Cards stay white and the page (paper) becomes a light cool gray with neutral borders, following the reference survey card. Satisfaction faces, survey data colors and the primary button color do not change.

## 1. Current state

### Logo and icons

| Asset | Today | Source |
| --- | --- | --- |
| `src/app/icon.png` (favicon) | 512×512, panda head on the flat pink background | crop of `design/logo-source.png` (`scripts/brand-assets.mjs`) |
| `src/app/apple-icon.png` | 180×180, same crop | same |
| `src/assets/brand/logo-icon.webp` | 128×128, same crop; used by `Logo` | same |
| `src/assets/brand/panda-hero.webp` | landing hero illustration | crop of `logo-source.png` |
| `opengraph-image.png`, `twitter-image.png` | 1200×630, full logo on pink | `logo-source.png` |

`Logo` (`src/components/brand/Logo.tsx`), used by the sidebar (`AppSidebar`) and the landing nav (`LandingNav`): a rounded tile (`size-10`, `bg-brand` pink, pink shadow) with the webp inside, and the "Panda Metrics" wordmark next to it. The sidebar keeps the tile at `size-10` in the collapsed rail; the wordmark becomes `sr-only` when collapsed.

### `design/logo.svg`

- The panda in a dark hoodie, white face, brown hood, tan paw pads. It looks transparent but is not: it is a trace of an image that showed a transparency checkerboard, so the checkerboard is drawn in (152 of the 308 paths are white / gray squares over a full-canvas brown rectangle).
- `viewBox="0 0 1875 2048"` (taller than wide), plus `width="1272" height="1389"`, `preserveAspectRatio="none"` and `style="display: block"`. With `preserveAspectRatio="none"`, any box that is not 1875:2048 **stretches** the drawing.
- 308 `<path>` elements, 99 KB, 9 fills (white, light gray, browns, tan). No `<image>`, no scripts.
- The "specks" next to the right ear are irregular checkerboard squares.

### Theme (light)

`src/app/globals.css`, pink-tinted surfaces:

| Token | Value | Role |
| --- | --- | --- |
| `--background` | `#fdf8f9` | page (paper) |
| `--card`, `--popover`, `--sidebar` | `#ffffff` | cards, menus, sidebar |
| `--card-border` | `#fcccd5` | card borders (33 files use it) |
| `--border`, `--input`, `--sidebar-border` | `#efdfe4` | dividers, inputs, sidebar edge |
| `--muted`, `--secondary` | `#f7eef0` | input fills (`bg-muted/60`), muted pills, secondary buttons |
| `--muted-foreground` | `#6e5d63` | secondary text |
| `--accent`, `--sidebar-accent` | `#fff0f4` | active nav, number tiles, badges, row hover |
| `--primary` | `#a85569` | buttons, links, focus ring (**stays**) |

Dark mode uses plum-brown surfaces tinted with the same pink.

### Reference image (sampled)

| Element | Color |
| --- | --- |
| Page | `#eceef3` – `#efefef` (cool light gray, slightly blue at the bottom) |
| Card | `#ffffff`, no visible border, soft edge |
| Bar track | `#ebeaef` |
| Divider | `#e9e9e9` |
| Text | near black, muted text dark gray |

## 2. Logo

### Prepare the SVG once

A build step in `scripts/brand-assets.mjs` (with `svgo`, dev dependency) reads `design/logo.svg` and writes an optimized copy:

1. **Square viewBox** around the panda itself (`-35 40 1968 1968`; the drawing spans x 88–1810, y 79–1968), so icons are square, never stretched, and the panda fills them.
2. Remove `width`, `height`, `preserveAspectRatio="none"` and `style` (the size comes from CSS; the default `xMidYMid meet` keeps proportions).
3. Remove the drawn checkerboard once in the source (done in phase 1): the silhouette was found by flood-filling the checkerboard from the edges of a render, traced to a `clipPath`, and every path outside it dropped. The committed `design/logo.svg` is the clean, transparent panda.
4. SVGO with `floatPrecision: 1`, merged paths: expected to land well under the current 99 KB (to be measured).

Outputs:

| File | Use | Notes |
| --- | --- | --- |
| `src/assets/brand/logo.svg` | `Logo` component (sidebar, landing nav) | static import |
| `src/app/icon.svg` | favicon for modern browsers | Next adds `<link rel="icon" type="image/svg+xml" sizes="any">` |
| `src/app/icon.png` | fallback favicon (Safari and older browsers do not use SVG favicons everywhere) | 512×512 rendered from the SVG on transparent background; Next emits both links |
| `src/app/apple-icon.png` | iOS home screen | 180×180 on an **opaque** background (iOS fills transparency with black): the panda centered on the brand pink `#db8396` (decided) |

`src/assets/brand/logo-icon.webp` is deleted. The **hero** (`panda-hero.webp`) and the **OG / Twitter images** keep coming from `logo-source.png` (they show the full brand with the wordmark on pink); changing them is out of scope.

Favicon legibility: at 16–32px the panda's white face and dark hood read well on light tab bars. On dark tab bars the dark hood blends in but the white face stays visible. No separate small-size drawing is needed.

### `Logo` component

- Static import: `import logoMark from "@/assets/brand/logo.svg"` with `next/image`. Next does not optimize SVGs and sets `unoptimized` automatically when the `src` ends in `.svg` (`image.md`, "dangerouslyAllowSVG"), so no config change is needed.
- **No pink tile (decided)**: the icon is the panda alone. The tile (`bg-brand`, pink shadow, `overflow-hidden`) is removed; the image is `object-contain` in a square box.
- Sizes: sidebar expanded `size-10` (40px), collapsed rail `size-10` (centered, as today), landing nav `size-11`.
- Accessible name unchanged: the wordmark is the name; the image has `alt=""` when the wordmark is shown (or `sr-only` when collapsed) and `alt="Panda Metrics"` only when there is no wordmark.
- Dark mode: the dark hood on the new dark sidebar (`#16191e`) may lose its outline. The white face keeps the panda recognizable; check it in the browser and, only if the hood edge disappears, add a soft `drop-shadow` in light color (`dark:drop-shadow-[0_0_1px_rgb(255_255_255/0.35)]`), still without a tile.

## 3. Surfaces (light theme)

### Palette

Cards white, page a cool light gray, neutral borders and fills; everything pink stays where it carries the brand (primary, accent tints, active nav, badges).

| Token | Today | Proposed | Why |
| --- | --- | --- | --- |
| `--background` | `#fdf8f9` | **`#f1f3f7`** (shipped `#f2f4f8`, see 4b) | the paper, between the sampled `#eceef3` and `#efefef` |
| `--card` / `--popover` | `#ffffff` | `#ffffff` | unchanged |
| `--sidebar` | `#ffffff` | `#ffffff` | the sidebar reads as one more white surface on the gray |
| `--card-border` | `#fcccd5` | **`#e4e7ed`** | the reference card has almost no border; a neutral hairline keeps cards separate on the gray |
| `--border`, `--input`, `--sidebar-border` | `#efdfe4` | **`#e4e7ed`** | neutral dividers and input outlines |
| `--muted`, `--secondary` | `#f7eef0` | **`#f3f4f7`** | neutral input fills and muted pills (input `bg-muted/60` on white ≈ `#f8f9fb`) |
| `--muted-foreground` | `#6e5d63` | **`#5b6170`** | neutral gray text |
| `--foreground` | `#2b1e24` | `#2b1e24` | unchanged (warm near black; neutral `#1f2329` is an option) |
| `--accent`, `--sidebar-accent`, `--accent-foreground` | pink | unchanged | active nav, number tiles, type badges, row hover stay pink |
| `--primary`, `--ring`, `--brand`, `--highlight` | pink | unchanged | as requested |
| `--control-border` | `#a08089` | unchanged | still 3.18:1 on the new page (a neutral gray of the same lightness fails 3:1) |
| reaction / star / success / destructive colors | — | unchanged | survey data and status |

Measured contrast with the proposed values (WCAG):

| Pair | Ratio | Check |
| --- | --- | --- |
| foreground on page / card | 14.39 / 15.98 | AA |
| muted-foreground on page / card / muted | 5.58 / 6.20 / 5.63 | AA |
| primary (pink text, links) on page / card | **4.54** / 5.04 | AA, close to the limit on the page |
| accent-foreground on page | 5.27 | AA |
| success text on page | 4.69 | AA |
| destructive text on page | 4.35 | below 4.5; only used on cards today (4.83), keep it there |
| control-border on page / card | 3.18 / 3.53 | 3:1 UI |
| primary-foreground on primary (buttons) | 5.04 | AA, unchanged |

`scripts/check-contrast.mjs` already covers these pairs; it will fail the build if any drops below its minimum.

### Card edge

The reference card separates from the page with a very soft shadow instead of a visible border. Two options:

- **Border only** (`--card-border: #e4e7ed`): no class changes; cards look flat but clear.
- **Border + soft shadow**: add a shared `shadow-[0_1px_2px_rgb(16_24_40/0.04),0_1px_3px_rgb(16_24_40/0.06)]` (or Tailwind `shadow-xs`) to the main surfaces (`FormSection`, table cards, dashboard cards, profile card).

Recommendation: start with the border only (token change, no component edits), then decide on the shadow by looking at it.

### Where pink surfaces remain on purpose

- Active sidebar item, number tiles in form cards (`01`, `02`), type and role badges, "Coming soon" badges, row hover / selection (`bg-accent/40`, `bg-accent/60`), share panel QR box (`bg-accent/40`), category picker selected card.
- Survey list dots, faces, stars, poll colors (survey data).

With the neutral page these read as accents, closer to the reference (white card, pink only on brand elements).

## 4. Surfaces (dark theme)

Decided: dark follows the same idea as light. The plum-brown surfaces become neutral cool grays; the page is the darkest layer and cards sit one step lighter (the dark equivalent of "white card on gray paper"). Pink stays on primary, accent, brand and survey data.

| Token | Today | Proposed |
| --- | --- | --- |
| `--background` | `#1d1418` | **`#121418`** |
| `--card` / `--popover` | `#261b20` | **`#1b1e24`** |
| `--sidebar` | `#211719` | **`#16191e`** |
| `--muted`, `--secondary` | `#33252b` | **`#262a31`** |
| `--muted-foreground` | `#c2adb4` | **`#a8aebb`** |
| `--sidebar-foreground` | `#d9c6cc` | **`#c9ced8`** |
| `--card-border` | `#4a323b` | **`#2e323a`** |
| `--border`, `--sidebar-border` | `rgb(255 228 236 / 10%)` | **`rgb(255 255 255 / 10%)`** |
| `--input` | `rgb(255 228 236 / 15%)` | **`rgb(255 255 255 / 15%)`** |
| `--control-border` | `#8a6b75` | **`#7b8190`** (neutral; passes 3:1 in dark) |
| `--foreground`, `--card-foreground`, `--secondary-foreground` | `#f6edef` | unchanged (or neutral `#eef0f4`, same contrast) |
| `--primary`, `--ring`, `--accent`, `--accent-foreground`, `--sidebar-accent*`, `--inverse`, `--brand`, chart / reaction / star / success / destructive | pink / data | unchanged |

Measured contrast (WCAG):

| Pair | Ratio |
| --- | --- |
| foreground on page / card / muted | 16.05 / 14.53 / 12.54 |
| muted-foreground on page / card / muted | 8.29 / 7.50 / 6.47 |
| primary on page / card / accent | 6.76 / 6.12 / 5.02 |
| primary-foreground on primary | 6.90 |
| accent-foreground on accent | 9.62 |
| sidebar-foreground on sidebar | 11.16 |
| success / destructive on card | 9.44 / 6.04 |
| control-border on card / page | 4.28 / 4.73 |

All pairs in `check-contrast.mjs` pass. The pink `--accent` (`#3b2830`) on the neutral card reads as a warm tint for the active nav and tiles, as in light mode.

## 4b. Blue primary (added during phase 2)

Requested after the research: the primary changes from pink to **`#4263eb`** (kept exact), with a dark equivalent. The brand pink `#db8396` stays on the logo, icons and landing illustrations; every interface color that followed the pink now follows the blue.

| Token | Light | Dark |
| --- | --- | --- |
| `--primary`, `--ring`, `--sidebar-primary`, `--sidebar-ring`, `--chart-1` | `#4263eb` | `#748ffc` |
| `--primary-foreground` | `#ffffff` | `#0b1220` |
| `--accent`, `--sidebar-accent` | `#f0f4ff` | `#1f2a4d` |
| `--accent-foreground`, `--sidebar-accent-foreground` | `#3b5bdb` | `#bac8ff` |
| `--chart-2` | `#748ffc` | `#91a7ff` |
| `--control-border` | `#858b98` (neutral) | `#7b8190` |
| `--inverse` | unchanged | `#2a2f38` |

Contrast: white on the blue button 4.98; blue text 4.98 on cards but 4.48 on the planned `#f1f3f7` page and 4.45 on a `#edf2ff` tint, so the page is `#f2f4f8` (4.52) and the accent `#f0f4ff` (4.53). Dark: blue text 6.21 on the page, 5.63 on cards, 4.73 on the accent, button text 6.31. Dark values follow the same indigo scale (`#748ffc`, `#91a7ff`, `#bac8ff`).

## 5. Files

| Action | Files |
| --- | --- |
| Change | `scripts/brand-assets.mjs` (SVG pipeline: optimized `logo.svg`, `icon.svg`, `icon.png` and `apple-icon.png` from the SVG), `src/components/brand/Logo.tsx` (SVG, no tile), `src/app/globals.css` (light and dark tokens), `docs/landing.md` (asset table) |
| New | `src/assets/brand/logo.svg`, `src/app/icon.svg` |
| Regenerated | `src/app/icon.png`, `src/app/apple-icon.png` |
| Delete | `src/assets/brand/logo-icon.webp` |
| Dev dependency | `svgo` |
| Unchanged | hero, OG / Twitter images, reaction / star / poll colors, primary, accent |

## 6. Verification

- `yarn lint` (contrast check with the new tokens), `tsc --noEmit`, `yarn build`.
- Favicon: the HTML has `<link rel="icon" type="image/svg+xml">` and the PNG fallback; the tab shows the panda in Chrome, Firefox and Safari; `apple-icon.png` is opaque.
- Sidebar: the panda without tile, centered in the collapsed rail (center still 32px), crisp at 40px, wordmark and accessible name unchanged; landing nav logo.
- Pages: dashboard, surveys list, survey form, users list and forms, profile, landing — light: white cards on the gray page; dark: `#1b1e24` cards on the `#121418` page; neutral borders, faces unchanged, primary buttons unchanged; 375 / 768 / 1280.
- No stretched logo anywhere (square box, `meet`); panda outline visible on the dark sidebar.

## 7. Phases

Two specs:

1. **Logo**: SVG pipeline in `brand-assets.mjs` (square viewBox, cleanup, SVGO), `icon.svg` + `icon.png` + `apple-icon.png` on brand pink, `Logo` with the SVG and without the pink tile, delete `logo-icon.webp`.
2. **Surfaces**: light tokens (`background #f1f3f7`, neutral `card-border` / `border` / `input` / `muted` / `secondary` / `muted-foreground`) and dark tokens (section 4), contrast check, screenshots of every view in both themes; card shadow decided afterwards.

Decisions (confirmed):

- Sidebar logo: the panda alone, no pink tile.
- `apple-icon.png` on the brand pink `#db8396` (for now).
- Page color `#f1f3f7`.
- Dark mode neutralized to match the light change (section 4).
