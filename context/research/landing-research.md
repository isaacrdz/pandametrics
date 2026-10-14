# Landing Page and Brand Colors

## Output

`docs/landing.md`

## Research

Document how to build the public landing page at `/` from the landing screenshots, using the logo in `src/lib/media/logo.png`, and how to rebrand the whole project around the logo's colors:

- the logo's **pink** becomes the **primary color** of the project (light mode);
- the **dark mode** uses a dark tone that **blends with that pink** instead of today's neutral purple-gray.

The result must be detailed enough to split the work into phased feature specs.

## Include

Current state:

- `/` redirects to `/dashboard` (`src/app/page.tsx`); there is no public page, no `/login` and no auth.
- The admin lives in the `(app)` route group (sidebar + top bar); the sidebar logo is a purple tile with a sparkles icon and the text "panda metrics".
- Theme tokens in `src/app/globals.css` are purple / indigo:
  - light: `--primary #6439c4`, `--highlight #5d62d6`, `--accent #efedfd`, `--card-border #ddd4f6`, `--ring #8b7cf0`, sidebar tokens;
  - dark: `--background #14141c`, `--card #1c1c27`, `--primary #8b6cf0`.
  - List every token and every place that depends on them: stat highlight card, primary buttons, poll bars, carousel dots, active nav pill, badges, focus rings, form section tiles, share panel, category picker.
- The logo file:
  - `src/lib/media/logo.png`, 5504×3072, **14.7 MB**: a panda in a grey hoodie with "PANDA METRICS" text on a flat pink background;
  - too heavy to ship as is, and `src/lib/media/` is not where Next.js serves static files from.
- Colors sampled from the logo (pngjs): background pink **`#db8396`**, dark brown of "PANDA" **`#210a10`**, cream of "METRICS" **`#f1ecdb`**.
- next-intl with the language in `localStorage` (server renders English, translated text in Client Components), `cacheComponents: true`.

Screen description, from `landing-view.png`, `landing-view-2.png` and `landing-view-3.png`, section by section:

- **Nav bar**:
  - logo tile (rounded square with the panda) + "Panda Metrics";
  - center links "Funciones", "Cómo funciona", "Precios";
  - right: "Iniciar sesión" (pink text) and "Crear cuenta" (pink filled button).
- **Hero** (two columns):
  - **Left column**:
    - a pill badge with a green dot ("Feedback que mueve tu producto");
    - a very large bold headline ("Entiende mejor a las personas que usan tu producto.");
    - a subtitle;
    - CTAs "Empieza gratis →" (filled pink, shadow) and "Conoce más" (white);
    - two check items ("Sin tarjeta de crédito", "Configuración en minutos").
  - **Right column**:
    - a white rounded frame holding a pink panel with the panda illustration;
    - a floating stat card "Respuestas este mes 2,486" with a "+18.4%" chip and a small pink bar chart.
  - Soft pink radial background.
- **Features**:
  - eyebrow "TODO LO QUE NECESITAS" (pink, spaced);
  - title "Feedback claro, decisiones confiables.";
  - 3 cards on a light pink tint, each with an icon tile (sparkles, bar chart, star), a title and a description.
- **CTA banner**:
  - dark rounded block (the dark tone);
  - eyebrow "LISTO PARA ESCUCHAR";
  - headline "Haz preguntas. Descubre patrones. Crece con confianza.";
  - white button "Crear mi cuenta →" with pink text;
  - placed on a very light pink section background.
- **Footer**: divider, "© 2026 Panda Metrics" on the left, "Feedback simple para equipos que escuchan." on the right.

Copy issues to fix (recommend the final copy in English and Spanish):

- "colecciones" → "encuestas" / "surveys" (project naming decision)
- "satisfacción, rating y preguntas abiertas": open questions do not exist. The categories are Satisfaction, Rating and Poll.
- "Precios" and "Cómo funciona" links have no section in the screenshots. Decide whether to add a "How it works" section (3 steps: create, share link / QR / kiosk, read metrics) and what to do with pricing (hide the link, or a simple "Free while in beta" section).
- "Empieza gratis", "Crear cuenta", "Iniciar sesión": there is no auth yet. Decide where they link for now (`/dashboard`, a disabled state, or `/login` placeholder) and how they change when Auth.js exists.

Brand colors (the core of the rebrand):

- Primary pink from the logo (`#db8396`) and its contrast:
  - **White text on `#db8396` is 2.73:1**, which fails WCAG AA for buttons and body text.
  - Options: a darker pink for filled buttons and text links (e.g. `#a84d66`: 5.36:1 on white), or dark text on the logo pink (`#210a10` on `#db8396`: 6.90:1).
  - Recommend which value is `--primary`, which is a `--brand` surface / illustration color, and the full light scale (50 → 900) derived from the logo pink.
- Dark mode:
  - Backgrounds that mix the logo's dark brown and pink instead of neutral grays (candidates checked: `#1d1418`, `#241a1f`, `#2a1d24`; logo pink on them ≈ 6–6.6:1, cream on them ≈ 14–15:1).
  - Recommend background, card, muted, border, primary (a lighter pink for dark mode), ring and sidebar values.
  - Check contrast for text, muted text, primary buttons and focus rings.
- Cream (`#f1ecdb`) and the dark brown (`#210a10`) as optional neutrals: where they help (landing hero, CTA banner, foreground text) and where they would hurt (charts, form inputs).
- Tokens that must **not** follow the brand:
  - reaction colors, star colors and poll fallback colors: survey data, from the overview palette;
  - the success green for the "Active" status;
  - check that pink primary next to the red "Very bad" reaction and the destructive red stays distinguishable.
- Highlight card ("Total responses"): today it is indigo. Decide pink (brand) or the dark tone.
- Full token table, light and dark, ready to paste into `globals.css`, and the impact on every existing screen (dashboard, cards, charts, survey form, dialogs, toasts, sidebar active state). Screenshots before and after.
- Update `context/project-overview.md` section 11 (visual design system) and the tokens table in `docs/dashboard.md`.

Logo assets:

- Optimized derivatives generated once from the 14.7 MB source (script with `sharp` or similar, committed outputs), and where they live (`public/brand/` or imported from `src/assets/` for `next/image` static imports):
  - square icon of the panda head on pink (nav tile, sidebar, favicon `src/app/icon.png`, `apple-icon.png`);
  - hero illustration crop (panda with hoodie, without the text, for the pink panel);
  - full logo with text (Open Graph image);
  - WebP / AVIF sizes and expected weights.
- Whether to keep the original PNG in the repo (size) or move it out of `src/`.
- A `Logo` component (icon + "Panda Metrics" wordmark) reused by the landing nav and the admin sidebar (replacing the sparkles tile), with the collapsed sidebar showing only the icon.
- Accessibility: `alt` text and decorative images.

Routing and layout:

- `/` becomes the landing; the `/` → `/dashboard` redirect is removed.
- A `(marketing)` route group with its own layout (no sidebar, no top bar, its own nav and footer), next to `(app)`.
- How to keep the landing **fully static** under `cacheComponents: true` (no runtime data).
- In-page anchors for the nav links (`#features`, `#how-it-works`), smooth scroll with `scroll-margin` under a sticky nav, reduced motion.
- Mobile:
  - nav collapses into a menu (`Sheet`) with the links and both auth buttons;
  - hero stacks (text then visual), and the headline sizes down;
  - feature cards stack;
  - the CTA banner stacks its button under the text.

i18n and SEO:

- All landing copy in `src/messages/{en,es}.json` (`landing` namespace). English default, Spanish via the language switcher (should the landing nav include the switcher? Recommend).
- SEO trade-off of the current i18n design:
  - the server always renders English, so the landing's indexed HTML is English only;
  - the localStorage switch happens on the client;
  - decide if that is acceptable for now, and what would change if Spanish SEO matters later.
- Metadata for `/`: title, description, Open Graph / Twitter image from the logo, `themeColor` from the brand pink.

Components:

- Files under `src/components/landing/`: `LandingNav`, `MobileNav`, `Hero`, `HeroVisual` (illustration + floating stat card), `FeaturesSection`, `FeatureCard`, `HowItWorksSection` (if added), `CtaBanner`, `LandingFooter`.
- Which ones need `'use client'`: translated text needs it under the current i18n design; explain the static rendering consequences.
- Which shadcn components they reuse (`Button`, `Badge`, `Card`, `Sheet`).
- The hero stat card: illustrative static numbers (not the mock data), decorative for screen readers or with a short accessible description.

Phases:

1. Brand tokens: pink primary and pink-tinted dark mode in `globals.css`, contrast checks, existing screens verified (dashboard, form, dialogs), overview and docs updated
2. Logo assets and `Logo` component: optimized derivatives, favicon / app icons, sidebar logo replaced
3. Landing page: `(marketing)` layout, nav, hero, features, CTA banner, footer, messages in both languages, metadata and OG image
4. Responsive, accessibility and polish: mobile nav, reduced motion, dark mode of the landing, screenshots against the references

Recommendation: the simplest approach that fits the project's patterns, keeps text accessible (AA contrast), keeps the landing static, and works with the current i18n design (language in `localStorage`).

## Sources

- @context/project-overview.md
- @context/coding-standars.md
- @src/app/globals.css
- @src/app/layout.tsx
- @src/app/page.tsx
- @src/app/(app)/layout.tsx
- @src/components/layout/AppSidebar.tsx
- @src/i18n/LocaleProvider.tsx
- @src/messages/en.json
- @docs/dashboard.md
- @docs/i18n.md
- @src/lib/media/logo.png
- @context/screenshots/landing-view.png
- @context/screenshots/landing-view-2.png
- @context/screenshots/landing-view-3.png
- shadcn/ui documentation (context7): theming tokens, `Sheet`
- `node_modules/next/dist/docs/`: `next/image` (static imports, `priority`, `sizes`), app icons (`icon`, `apple-icon`, `opengraph-image`), metadata and `themeColor` / viewport, route groups and multiple layouts, static rendering with Cache Components
