# Landing Page and Brand Colors

How to build the public landing at `/` from the landing screenshots, and how to rebrand the whole project around the logo (`src/lib/media/logo.png`):

- the logo's **pink** becomes the primary color;
- **dark mode** uses a dark tone that blends with that pink.

Researched on 2026-10-13 against `main` at `6b24146`. Sources:

- Next.js 16.4 docs in `node_modules/next/dist/docs/` (`next/image`, app icons, `opengraph-image`, viewport);
- color measurements made with pngjs and an OKLCH script; contrast is WCAG 2.x relative luminance;
- sample image derivatives made with `sharp` 0.35 (already installed through Next).

## 1. Current state

| Area | Today |
| ---- | ----- |
| `/` | `src/app/page.tsx` redirects to `/dashboard`. No public page, no `/login`, no auth |
| Layouts | Root layout (fonts, `LocaleProvider`, theme, toaster) and the `(app)` group (sidebar + top bar) |
| Sidebar logo | Purple `bg-highlight` tile with a `SparklesIcon` + "panda metrics" text (`AppSidebar.tsx`) |
| i18n | Language in `localStorage`, server renders English, translated text only in Client Components |
| Rendering | `cacheComponents: true`; `/surveys/new` and `/` are static |

### Theme tokens (`src/app/globals.css`)

| Token | Light | Dark |
| ----- | ----- | ---- |
| `--background` | `#f8f8fc` | `#14141c` |
| `--foreground` | `#2f3241` | `#ececf3` |
| `--card` / `--popover` | `#ffffff` | `#1c1c27` |
| `--muted` / `--secondary` | `#f1f1f5` | `#262633` |
| `--muted-foreground` | `#6b7080` | `#a1a4b5` |
| `--border` / `--input` | `#e7e7ef` | `white / 10%`, `/ 15%` |
| `--primary` | `#6439c4` | `#8b6cf0` |
| `--accent` / `--accent-foreground` | `#efedfd` / `#5b46d6` | `#2a2440` / `#c4b5fd` |
| `--ring` | `#8b7cf0` | `#8b7cf0` |
| `--highlight` | `#5d62d6` | `#6b70e6` |
| `--card-border` | `#ddd4f6` | `#3a3355` |
| `--sidebar-*` | white, purple accent | `#1c1c27`, purple accent |
| `--chart-1..5` | purple, indigo, cyan, amber, green | lighter variants |
| `--success`, `--reaction-*`, `--star*` | data / status colors | same |

### Who uses them

| Token | Components |
| ----- | ---------- |
| `primary` | `NavMain` (active dot), `LanguageSwitcher` (check), `SurveyResults` (carousel dots), `PollChart` (counts and bars), `SurveyCard` (edit button), `CategoryPicker`, `SharePanel`, `SurveyFormHeader`, `QuestionsSection`, every shadcn `Button` default, `Badge`, `Switch`, `RadioGroup` |
| `highlight` | `StatCard` ("Total responses"), `NewSurveyButton`, `AppSidebar` logo tile, `CollectionsToolbar` range dot |
| `accent` | `NavUser`, `PollChart`, `EmptyState`, `CreateSurveyCallout`, `SurveyCard`, `CategoryPicker`, `QuestionsSection`, `SharePanel`, `FormSection` tiles, `SurveyFormHeader`, sidebar active pill, dropdown items |
| `card-border` | dashboard cards, skeletons, `EmptyState`, `CreateSurveyCallout`, form sections, share panel |
| `ring` | focus rings everywhere, `AppSidebar`, `SurveyResults`, `CategoryPicker`, `ReactionOptionsEditor` |
| `success` | status dot, `StatCard` hint, `OrganizationSwitcher`, `PublishToggle` |

The only hard-coded colors outside `globals.css` are the flags (`LanguageFlag`) and the QR (`QrCode`, black on white, must stay), plus the `sky-*` info alerts in `CategoryPicker` / `OptionsHeader`. **The rebrand is almost entirely a `globals.css` change.**

### The logo

- `src/lib/media/logo.png`: 5504×3072, **14.7 MB**. A panda in a grey hoodie with "PANDA METRICS" text on a flat pink background.
- Too heavy to ship:
  - `opengraph-image` files over 8 MB **fail the build** (Next docs);
  - `src/lib/media/` is not served by Next.
- Sampled colors:

| Color | Hex | OKLCH |
| ----- | --- | ----- |
| Background pink | `#db8396` | `0.708 0.110 6.3` |
| Dark brown ("PANDA" letters) | `#210a10` | |
| Cream ("METRICS" letters) | `#f1ecdb` | |

## 2. Screen description

From `landing-view.png`, `landing-view-2.png` and `landing-view-3.png`:

- **Page background**: very light pink with a soft pink radial glow at the top left of the hero.
- **Nav** (max width ~1120px, centered):
  - logo tile (rounded square with the panda on pink, ~44px) + "Panda Metrics" (bold);
  - center links "Funciones", "Cómo funciona", "Precios" (muted, ~15px);
  - right: "Iniciar sesión" (pink semibold text) and "Crear cuenta" (pink filled, rounded, soft pink shadow).
- **Hero**, two columns (~1 : 1):
  - **Left column**:
    - pill badge: white with a pink border, green dot, "Feedback que mueve tu producto" in pink;
    - headline: very large and bold (~80px, tight leading), dark foreground, 4 lines;
    - subtitle: ~20px muted, 3 lines;
    - CTAs: "Empieza gratis →" (pink filled, large, pink shadow) and "Conoce más" (white, pink text);
    - two check items with green check icons: "Sin tarjeta de crédito", "Configuración en minutos".
  - **Right column**:
    - white rounded frame (~32px radius, big soft shadow) containing a pink rounded panel with the panda illustration (hood, face, paws);
    - a floating white card over the bottom of the panel: "Respuestas este mes", "2,486" (bold), a green "+18.4%" chip and 10 pink bars of growing height.
- **Features** (white section):
  - eyebrow "TODO LO QUE NECESITAS" (pink, uppercase, letter-spaced);
  - title "Feedback claro, decisiones confiables." (~40px bold);
  - 3 cards (very light pink background, light pink border, ~20px radius), each with a pink icon tile (sparkles, bar chart, star), a semibold title and a 3-line muted description.
- **CTA banner**:
  - very light pink section with a top divider;
  - dark rounded block (~32px radius) holding the eyebrow "LISTO PARA ESCUCHAR" (light pink), the headline "Haz preguntas. Descubre patrones. Crece con confianza." (white, ~40px bold, 2 lines) and a white button "Crear mi cuenta →" with pink text on the right.
- **Footer**: divider, "© 2026 Panda Metrics" on the left, "Feedback simple para equipos que escuchan." on the right (small muted).

## 3. Brand colors

### Primary pink and contrast

The logo pink `#db8396` cannot carry white text:

| Text / background | Ratio | AA (4.5:1 text, 3:1 large or UI) |
| ----------------- | ----- | -------------------------------- |
| white on `#db8396` | 2.73 | fails |
| `#210a10` (dark brown) on `#db8396` | 6.90 | passes |
| white on `#b76276` (scale 600) | 4.18 | fails text, passes large |
| white on **`#a85569`** | **5.04** | passes |
| **`#a85569`** as text on `#fdf8f9` (page background) | **4.79** | passes |
| **`#a85569`** as text on `#fff0f4` (accent) | **4.56** | passes |

**Recommendation:**
- **`--primary: #a85569`** (OKLCH `0.555 0.110 6.3`, the same hue and chroma as the logo). It works both for filled buttons with white text and for pink text links and labels on white or pink tints. One token covers every current `bg-primary` / `text-primary` use.
- **`--brand: #db8396`** (new token), the logo pink, for non-text surfaces only:
  - the hero illustration panel;
  - the logo tile;
  - decorative glows and bars;
  - the dark-mode primary (see below).

### Pink scale (same hue, OKLCH)

| Step | Hex | White on it | `#210a10` on it | Use |
| ---- | --- | ----------- | --------------- | --- |
| 50 | `#fff0f4` | 1.10 | 17.05 | `--accent`, feature cards |
| 100 | `#fee6ea` | 1.19 | 15.89 | hover tints |
| 200 | `#fcccd5` | 1.42 | 13.21 | `--card-border`, chart tracks |
| 300 | `#fea3b6` | 1.89 | 9.98 | eyebrow on the dark banner, dark accent text |
| 400 | `#e48b9e` | 2.47 | 7.61 | decorative bars |
| 500 | `#db8396` | 2.73 | 6.90 | `--brand` (logo), dark-mode primary |
| — | `#a85569` | 5.04 | — | `--primary` (light) |
| 700 | `#9c4b5f` | 5.86 | 3.21 | `--accent-foreground` (5.31 on 50) |
| 800 | `#7c2e43` | 9.02 | 2.09 | hover of primary |
| 900 | `#4b202b` | 13.63 | 1.38 | dark accents |
| 950 | `#320a16` | 17.64 | 1.07 | — |

### Dark mode: dark tones blended with pink

The dark mode surfaces are the logo's dark brown lifted and tinted with the pink hue, instead of neutral blue-greys:

| Pair | Ratio |
| ---- | ----- |
| `#f6edef` (foreground) on `#1d1418` (background) | 15.68 |
| `#f6edef` on `#261b20` (card) | 14.51 |
| `#c2adb4` (muted text) on `#261b20` | 7.88 |
| `#210a10` on `#db8396` (primary button) | 6.90 |
| `#db8396` as text on `#261b20` | 6.11 |
| `#fcccd5` on `#3b2830` (accent) | 9.62 |
| `#db8396` ring on `#1d1418` | 6.61 (non-text, ≥3) |
| `#4a323b` card border on `#261b20` | 1.44 (decorative, like today) |

In dark mode the primary is the **logo pink itself** (`#db8396`) with dark-brown text: the brand color shows exactly as in the logo.

### Cream and dark brown

- **Cream `#f1ecdb`**: use only as an illustration color (the logo already carries it). As a page or card background it fights the pink tints and makes inputs look disabled. Not a token.
- **Dark brown `#210a10`**: `--primary-foreground` in dark mode and the base of the dark tone. For light-mode text, a softer `#2b1e24` (15.2:1 on the page background) reads better than pure `#210a10` at large sizes.
- **Dark tone for the CTA banner**: new token `--inverse`, `#2b1e24` in light mode (white text 15.98:1, eyebrow `#fea3b6` 8.47:1). In dark mode, use `#3b2830` with a `--card-border` border so it does not disappear into the page.

### Tokens that do not follow the brand

| Token | Why |
| ----- | --- |
| `--reaction-*`, `--star`, `--star-empty`, poll fallback colors | Survey data; the overview palette is the single source of truth and each option stores its color |
| `--success`, `--success-foreground` | Status ("Active") must read as green, not brand |
| `--destructive` | Red for delete. Pink primary (hue 6°) and red (hue ~27°) have similar luminance (1.1–1.2:1), so they are told apart by hue and style (destructive actions are outline or tinted, primary is filled). Keep both distinct styles |
| `sky-*` info alerts | Informational, neutral to the brand |

The Poll chart uses `--primary` for its bars and Satisfaction uses reaction colors, so pink and "Very bad" red never sit in the same chart.

### Highlight card ("Total responses")

Use the **primary pink** (`#a85569`, white text 5.04:1), with a soft shadow of the `--brand` pink, so the dashboard's main number carries the brand. `--highlight` becomes an alias of the primary; the "New survey" button and the sidebar logo tile follow automatically.

### Token table (ready for `globals.css`)

| Token | Light | Dark |
| ----- | ----- | ---- |
| `--background` | `#fdf8f9` | `#1d1418` |
| `--foreground` | `#2b1e24` | `#f6edef` |
| `--card` / `--popover` | `#ffffff` | `#261b20` |
| `--card-foreground` / `--popover-foreground` | `#2b1e24` | `#f6edef` |
| `--primary` | `#a85569` | `#db8396` |
| `--primary-foreground` | `#ffffff` | `#210a10` |
| `--secondary` / `--muted` | `#f7eef0` | `#33252b` |
| `--secondary-foreground` | `#2b1e24` | `#f6edef` |
| `--muted-foreground` | `#6e5d63` (5.86 on bg) | `#c2adb4` (7.88 on card) |
| `--accent` | `#fff0f4` | `#3b2830` |
| `--accent-foreground` | `#9c4b5f` | `#fcccd5` |
| `--border` / `--input` | `#efdfe4` | `rgb(255 228 236 / 10%)` / `/ 15%` |
| `--ring` | `#a85569` | `#db8396` |
| `--brand` (new) | `#db8396` | `#db8396` |
| `--inverse` / `--inverse-foreground` (new) | `#2b1e24` / `#ffffff` | `#3b2830` / `#f6edef` |
| `--highlight` / `--highlight-foreground` | `#a85569` / `#ffffff` | `#db8396` / `#210a10` |
| `--card-border` | `#fcccd5` | `#4a323b` |
| `--sidebar` | `#ffffff` | `#211719` |
| `--sidebar-foreground` | `#5b4a50` | `#d9c6cc` |
| `--sidebar-primary` / `-foreground` | `#a85569` / `#ffffff` | `#db8396` / `#210a10` |
| `--sidebar-accent` / `-foreground` | `#fff0f4` / `#9c4b5f` | `#3b2830` / `#fcccd5` |
| `--sidebar-border` / `--sidebar-ring` | `#efdfe4` / `#a85569` | `rgb(255 228 236 / 10%)` / `#db8396` |
| `--chart-1..5` | `#a85569`, `#db8396`, `#00acc1`, `#f59e0b`, `#22c55e` | `#db8396`, `#fea3b6`, `#22d3ee`, `#fbbf24`, `#4ade80` |
| `--success*`, `--reaction-*`, `--star*`, `--destructive` | unchanged | unchanged |

Expose `--brand` and `--inverse` in `@theme inline` (`--color-brand`, `--color-inverse`, `--color-inverse-foreground`).

### Impact on existing screens

| Screen | What changes |
| ------ | ------------ |
| Dashboard | Highlight card turns pink; carousel dots, poll bars and counts, edit buttons, range dot and active nav pill turn pink; page background gets a faint pink tint |
| Survey form | Section tiles, primary buttons, category cards (selected state), counters, "Add question", share panel, focus rings turn pink |
| Dialogs, toasts, dropdowns | Pink focus rings and primary actions; destructive stays red |
| Dark mode | Every surface becomes plum-brown instead of blue-grey; primary is the logo pink with dark text |
| Unchanged | Reaction faces and bars, stars, success green, QR, flags, info alerts |

Phase 1 must take before and after screenshots of the dashboard, the survey form (create and edit) and dark mode, and re-check contrast with the script used here.

Docs to update in phase 1:
- `context/project-overview.md` section 11, which still mentions shadcn tokens without colors;
- the tokens table in `docs/dashboard.md` (section 5, purple values).

## 4. Logo assets

### Derivatives

Generate them once with a script, using `sharp` (already installed with Next, v0.35) and `svgo` for the vector logo, and commit both the outputs and the script (`scripts/brand-assets.mjs`). Measured from the real source:

| Asset | Crop / size | Format | Weight | Destination |
| ----- | ----------- | ------ | ------ | ----------- |
| Logo (nav, sidebar) and SVG favicon | `design/logo.svg` (vector panda, transparent) with a square viewBox, optimized with SVGO | SVG | 28 KB | `src/assets/brand/logo.svg` (static import) and `src/app/icon.svg` (`<link rel="icon" type="image/svg+xml">`) |
| App icon fallback | the same SVG → 512×512, transparent | PNG | 49 KB | `src/app/icon.png` |
| Apple icon | the same SVG on the brand pink `#db8396` → 180×180, opaque | PNG | 11 KB | `src/app/apple-icon.png` |
| Hero illustration | crop `left 1706, top 92, 2092 wide`, cut just above the "PANDA" letters (~0.62 of the height) → 1200 wide | AVIF + WebP | 30 KB / 51 KB | `src/assets/brand/panda-hero.webp` (static import; `next/image` serves AVIF / WebP itself) |
| Open Graph / Twitter | full logo → 1200×630 cover | PNG | 373 KB | `src/app/opengraph-image.png` + `opengraph-image.alt.txt`, same for `twitter-image` |

- **Static imports** (`import panda from "@/assets/brand/panda-hero.webp"`) give `next/image` the width, height and a blur placeholder for free. `public/` is only needed for files referenced by URL; none are here.
- **Hero image**: Next 16 deprecates `priority` in favor of `preload`, and the docs recommend `fetchPriority="high"` or `loading="eager"` for the LCP image. Use `fetchPriority="high"` with `sizes="(min-width: 1024px) 480px, 90vw"`.
- **The 14.7 MB original**: move it out of `src/` to `design/logo-source.png`, where it is not imported and not shipped, so the derivatives can be regenerated. If repository size matters, keep it outside the repo (shared drive) and record where in the script header.

### `Logo` component

- `src/components/brand/Logo.tsx` (server-safe): the panda (`next/image` of `logo.svg`, no tile; see `docs/logo-and-surfaces.md`) + the wordmark "Panda Metrics". Prop `showWordmark` (default true).
- **Sidebar**: replaces the sparkles tile. In collapsed mode the wordmark is hidden with `group-data-[collapsible=icon]:hidden`, as today.
- **Landing nav**: links to `/`. The sidebar logo links to `/dashboard`.
- **Accessibility**:
  - the icon image has `alt=""` because the wordmark next to it is the accessible name;
  - with `showWordmark={false}`, the image gets `alt="Panda Metrics"`;
  - the hero illustration is decorative (`alt=""`), and the floating stat card carries the meaning.
- "Panda Metrics" is the brand: the same in both languages, kept in a constant (it already passes `react/jsx-no-literals` that way, as in `AppSidebar`).

## 5. Routing and layout

```
src/app/
├── layout.tsx              root (unchanged: fonts, LocaleProvider, theme, toaster)
├── opengraph-image.png     + alt.txt, twitter-image.png
├── icon.png, apple-icon.png
├── (marketing)/
│   ├── layout.tsx          LandingNav + {children} + LandingFooter, pink page background
│   └── page.tsx            the landing (replaces src/app/page.tsx)
└── (app)/                  unchanged
```

- Delete `src/app/page.tsx` (the `/` → `/dashboard` redirect) and add `(marketing)/page.tsx`. Two route groups cannot both define `/`, so the old file must go.
- **Fully static**: the landing reads no cookies, headers, params or search params. Under `cacheComponents: true` the build marks `/` as static (○), like `/surveys/new` today. The only client-side behavior is translations, the mobile menu and the language switcher.
- **Anchors**: `#features` and `#how-it-works` sections with `scroll-mt-24` (sticky nav height). Smooth scrolling via `html { scroll-behavior: smooth }` inside `@media (prefers-reduced-motion: no-preference)`.
- **Sticky nav**: `sticky top-0`, translucent background (`bg-background/80 backdrop-blur`) and a bottom border once scrolled (CSS only: a border is acceptable from the start).

## 6. Copy

Fixes to the screenshot copy:
- "colecciones" → "encuestas";
- open questions → the real categories;
- no pricing.

| Key | en | es |
| --- | -- | -- |
| `landing.nav.features` | Features | Funciones |
| `landing.nav.howItWorks` | How it works | Cómo funciona |
| `landing.nav.signIn` | Sign in | Iniciar sesión |
| `landing.nav.signUp` | Create account | Crear cuenta |
| `landing.nav.menu` | Open menu | Abrir menú |
| `landing.hero.badge` | Feedback that moves your product | Feedback que mueve tu producto |
| `landing.hero.title` | Understand the people who use your product. | Entiende mejor a las personas que usan tu producto. |
| `landing.hero.subtitle` | Panda Metrics turns your customers' answers into simple, visual, actionable metrics. Ask, listen and grow. | Panda Metrics convierte las respuestas de tus clientes en métricas simples, visuales y accionables. Pregunta, escucha y crece. |
| `landing.hero.primaryCta` | Start for free | Empieza gratis |
| `landing.hero.secondaryCta` | Learn more | Conoce más |
| `landing.hero.noCard` | No credit card | Sin tarjeta de crédito |
| `landing.hero.quickSetup` | Set up in minutes | Configuración en minutos |
| `landing.hero.statLabel` | Responses this month | Respuestas este mes |
| `landing.hero.statDescription` | Example: 2,486 responses this month, up 18.4% | Ejemplo: 2,486 respuestas este mes, 18.4% más |
| `landing.features.eyebrow` | Everything you need | Todo lo que necesitas |
| `landing.features.title` | Clear feedback, reliable decisions. | Feedback claro, decisiones confiables. |
| `landing.features.humanTitle` | Surveys that feel human | Encuestas que se sienten humanas |
| `landing.features.humanText` | Create friendly feedback experiences with faces, stars or your own options. | Crea experiencias de feedback claras y agradables con caras, estrellas o tus propias opciones. |
| `landing.features.metricsTitle` | Metrics that are easy to read | Métricas fáciles de entender |
| `landing.features.metricsText` | Turn every answer into visual signals and make better decisions without losing time. | Convierte cada respuesta en señales visuales para tomar mejores decisiones sin perder tiempo. |
| `landing.features.allTitle` | Everything in one place | Todo en un solo lugar |
| `landing.features.allText` | Organize your surveys, share a link, QR or kiosk, and find out what your audience really thinks. | Organiza tus encuestas, compártelas por enlace, QR o kiosco y descubre qué piensa realmente tu audiencia. |
| `landing.how.eyebrow` | How it works | Cómo funciona |
| `landing.how.title` | From question to insight in three steps. | De la pregunta al hallazgo en tres pasos. |
| `landing.how.step1Title` / `step1Text` | Create a survey / Pick satisfaction, rating or poll and write your questions. | Crea una encuesta / Elige satisfacción, calificación u opción múltiple y escribe tus preguntas. |
| `landing.how.step2Title` / `step2Text` | Share it / Send the link, print the QR or leave a tablet in kiosk mode. | Compártela / Envía el enlace, imprime el QR o deja una tablet en modo kiosco. |
| `landing.how.step3Title` / `step3Text` | Read the results / See answers by day, question and option, in your timezone. | Lee los resultados / Mira las respuestas por día, pregunta y opción, en tu zona horaria. |
| `landing.cta.eyebrow` | Ready to listen | Listo para escuchar |
| `landing.cta.title` | Ask questions. Find patterns. Grow with confidence. | Haz preguntas. Descubre patrones. Crece con confianza. |
| `landing.cta.button` | Create my account | Crear mi cuenta |
| `landing.footer.copyright` | © {year} Panda Metrics | © {year} Panda Metrics |
| `landing.footer.tagline` | Simple feedback for teams that listen. | Feedback simple para equipos que escuchan. |
| `landing.metadata.title` / `description` | Panda Metrics: understand your customers / Collect feedback by kiosk, link or QR and turn it into clear metrics. | (English only: metadata is server-rendered) |

Decisions:

- **"How it works"**: add it as a small section between Features and the CTA. Three numbered steps on the existing card style give the nav link a target and explain the kiosk / link / QR value.
- **Pricing**: drop the "Precios" link; there is no pricing yet. Add it back with its section when plans exist.
- **Auth buttons**: there is no Auth.js yet, so "Sign in", "Create account", "Start for free" and "Create my account" link to **`/dashboard`** (the mock app). Keep the routes in one constant (`LANDING_LINKS`) so the change to `/login` / `/signup` is one line when auth lands. "Learn more" scrolls to `#features`.
- **Year**: `{year}` comes from a constant at build time (`2026`) or the client clock. Reading `new Date()` on the server would make the page dynamic under Cache Components, so render the footer year on the client or hardcode it with the build.

## 7. i18n and SEO

- All copy goes in the `landing` namespace of `src/messages/{en,es}.json`. The key parity check and `react/jsx-no-literals` apply.
- **Language switcher on the landing**: yes. Reuse `LanguageSwitcher` (it only needs `LocaleProvider`, which wraps the root layout) in the nav, and inside the mobile menu.
- **SEO trade-off**: the server always renders English, so search engines index the English landing; Spanish appears after hydration for visitors who chose it.
  - Acceptable now: the landing is the only public page and English is the default.
  - If Spanish SEO matters later, the options are Spanish-specific static routes (`/es`) for the marketing pages only, or locale routing for `(marketing)`. Both are compatible with keeping the admin on `localStorage`. Record it as an open decision in the overview.
- **Metadata** (English, server-rendered):
  - `title` and `description` in `(marketing)/page.tsx` (`export const metadata`, static);
  - `opengraph-image.png` and `twitter-image.png` with `.alt.txt` files;
  - `themeColor: "#db8396"` via `export const viewport` (the brand pink for the mobile browser bar, decorative so contrast does not apply).

## 8. Components

`src/components/landing/`:

| Component | Client | Uses | Notes |
| --------- | ------ | ---- | ----- |
| `LandingNav` | yes (text) | `Logo`, `Button`, `LanguageSwitcher`, `MobileNav` | Sticky; links hidden below `md` |
| `MobileNav` | yes | `Sheet`, `Button` | Menu button with `aria-label`; links + switcher + both auth buttons; closes on link click |
| `Hero` | yes (text) | `Badge`-like pill, `Button` (`asChild` + `Link`), `CheckIcon` | `h1` is the headline; CTAs as links |
| `HeroVisual` | yes (stat label) | `next/image` (`panda-hero`), `fetchPriority="high"` | Pink `bg-brand` panel in a white frame; floating stat card with static numbers (`2,486`, `+18.4%`, 10 bar heights in a constant), formatted with `useFormatter` |
| `FeaturesSection` / `FeatureCard` | yes (text) | lucide `SparklesIcon`, `ChartColumnIcon`, `StarIcon` | `id="features"`; cards `bg-accent/60 border-card-border` |
| `HowItWorksSection` | yes (text) | numbered tiles like `FormSection` | `id="how-it-works"` |
| `CtaBanner` | yes (text) | `Button` (white, `text-primary`) | `bg-inverse text-inverse-foreground` |
| `LandingFooter` | yes (text, year) | — | Divider, two lines |
| `Logo` (`src/components/brand/`) | no | `next/image` | Shared with the sidebar |

- Under the current i18n design every translated piece is a Client Component. The page is still **prerendered as static HTML** (English) at build time, so there is no runtime cost. Client components are hydrated, not fetched.
- **The hero stat card** is illustrative, not the mock data: the landing must not depend on the in-memory store.
  - The bars are `aria-hidden`.
  - The card has `role="img"` with `aria-label={t("hero.statDescription")}`, so screen readers get one sentence instead of 10 bars.

## 9. Responsive and accessibility

| Breakpoint | Layout |
| ---------- | ------ |
| `< md` | Nav: logo + menu button; hero stacked (text, then visual at full width), headline ~44px; feature and step cards stacked; CTA banner stacks the button under the text; footer lines stacked and centered |
| `md – lg` | Nav links visible; hero still stacked with a wider visual |
| `≥ lg` | Two-column hero as in the screenshot, headline ~72–80px |

- Contrast: every text pair above passes AA in both themes (section 3). Re-check the eyebrow pink and the muted text after implementation.
- Focus rings use `--ring` (pink); the skip link "Skip to content" at the top of the landing jumps to `<main id="content">`.
- Landmarks: `header` (nav), `main`, `footer`; one `h1` (hero), `h2` per section.
- Reduced motion: no animation is required. If the hero bars animate in, wrap the animation in `motion-safe:`.
- Dark mode: the landing follows the theme (`--background` plum, pink panel stays `--brand`, white frame becomes `--card`). The theme toggle lives in the admin user menu. The landing has no toggle and keeps the user's choice, light by default.

## 10. Phases

1. **Brand tokens**:
   - new light and dark values in `globals.css`, plus `--brand` and `--inverse`;
   - contrast script re-run, before / after screenshots of the dashboard, survey form and dark mode;
   - overview section 11 and `docs/dashboard.md` tokens updated.
2. **Logo assets**: `scripts/brand-assets.mjs` with `sharp` (crops in section 4), committed derivatives, `icon.png` / `apple-icon.png` / Open Graph images, the source moved to `design/`, the `Logo` component in the sidebar.
3. **Landing page**: `(marketing)` layout and page (redirect removed), nav, hero with visual, features, how it works, CTA banner, footer, `landing` messages in both languages, metadata and viewport `themeColor`.
4. **Polish**: mobile nav (`Sheet`), responsive pass at 375 / 500 / 768 / 1280, skip link and landmarks, dark mode of the landing, screenshots compared with the references.

## 11. Recommendation

- **Primary pink:** derive it from the logo hue as `#a85569`. It is the only value of that pink that passes AA both under white button text and as text on white or pink surfaces. Keep the exact logo pink `#db8396` as `--brand` for surfaces, illustrations and the dark-mode primary (with dark-brown text, 6.9:1).
- **Dark mode:** build it on plum-brown surfaces (`#1d1418` / `#261b20` / `#33252b`) tinted with the same hue, so it reads as the same brand rather than a neutral grey theme.
- **Scope:** the rebrand is almost entirely `globals.css`, because every component already uses tokens. Survey data colors, status green and destructive red stay as they are.
- **Landing:** a static `(marketing)` route group with Client Components for translated text, and optimized logo derivatives imported statically. Drop the pricing link, add a small "How it works" section, and point the auth CTAs to `/dashboard` through one constant until Auth.js exists.
