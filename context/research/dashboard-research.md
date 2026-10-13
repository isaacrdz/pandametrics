# Dashboard

## Output

`docs/dashboard.md`

## Research

Document how to build the admin dashboard at `/dashboard` from the preview screenshots, including the three survey result cards (Satisfaction, Rating, Poll), using shadcn/ui, Tailwind v4 and the mock data in `src/lib/mock-data.ts` until Prisma exists. The result must be detailed enough to split the work into phased feature specs.

## Include

Current state: what exists today (only `src/app/page.tsx` with the "Panda Metrics" `h1`, `src/app/layout.tsx`, `src/app/globals.css` with light tokens and a `.dark` class), that shadcn/ui, `next-themes`, an icon library and a font for the screenshots are not installed yet, and what `src/lib/mock-data.ts` and `src/types/survey.ts` already provide (`MOCK_SURVEYS`, `MOCK_RESPONSES`, `MOCK_CURRENT_USER`, `MOCK_CURRENT_ORGANIZATION`, `getMockSurveyMetrics`, `getMockActiveSurveys`, `getMockDashboardSummary`, `LAST_30_DAYS`, reaction / rating / poll colors)

Screen description, from `dashboard-preview.png` and `dashboard-preview-2.png`, region by region:

- Sidebar (fixed, white, right border): logo (purple rounded square with a sparkle icon) + "panda metrics" + collapse button; "WORKSPACE" group with Overview (active: light purple pill, purple text and a dot), Collections, History; divider; "MANAGE" group with Settings; user card at the bottom (initials avatar "JD", name, email)
- Top bar: current date ("Monday, October 14, 2024") above a greeting by time of day ("Good morning, Jordan"); on the right an organization switcher (green dot + "Acme Inc." + chevron) and a primary "New collection" button with a plus icon
- Stat cards row (3 columns): "Total responses" highlighted in solid indigo/purple with white text, a bar chart icon, the value (3,062) and the change vs. last month (+14.2%); "Active collections" with `4 /5` and a hint ("One spot remaining"); "Response rate" with 68.4% and "+4.8% this month"; outline icons in the top right corner of each card
- "Your collections" section: title, subtitle ("A snapshot of how your customers are feeling."), search input ("Search collections") and a date range select ("Last 30 days") on the right
- Survey cards in a 2-column grid (one per active survey)
- "Have another question in mind?" call-to-action card (dashed or soft border, plus icon tile, subtitle, "Create collection" button with a chevron)
- Footer: "Panda Metrics · Your feedback, made measurable"

Survey card design, from `card-poll.png`, `card-rating.png` and `card-satisfaction.png`. Shared structure:

- Outer card: survey name (bold), description, "Copiar Enlace" (outline purple) and "Ver / Editar" (solid purple, shadow) buttons
- Inner results panel (soft purple border, rounded): `código: XXXXXX` in monospace, status dot + "Activa" / "Inactiva", "Resumen de respuestas" title, question carousel (prev / next chevrons and pill dots, one dot per question, active dot wider and purple), question title numbered ("1. …") with "N respuestas" on the right, the category chart, a divider, and "Respuestas totales" with the total in bold

Category chart:

- Satisfaction: row of the 5 faces (circle with tinted background, colored border and soft glow, face drawn in the reaction color) with labels below, then 5 rows of colored dot + label + horizontal bar + count
- Rating: 5 rows of 1 to 5 stars (amber) + bar (amber fill on a light gray track) + count; also decide where the average (e.g. 4.1 ★) goes, since the overview requires it but the screenshot does not show it
- Poll: one tinted block per option with label on the left, "N respuestas" in bold purple on the right and a purple bar below

For each piece, describe: the component and file (`src/components/dashboard/…`), which shadcn/ui components it uses (`Sidebar`, `Card`, `Button`, `Input`, `Select`, `Avatar`, `DropdownMenu`, `Progress`, `Badge`, `Separator`, `Skeleton`, `Sonner`, `Tooltip`) and which are custom, Server vs. Client Component (only the carousel, copy link, search, date range and org switcher need `'use client'`), and the props it receives from the mock data (`Survey` + `SurveyMetrics`)

Design tokens: colors to add to `globals.css` with `@theme` (primary purple/indigo, surface, border, muted text, stat card highlight, reaction colors, star colors, poll color), radii, shadows, font (the screenshots look like Inter or SF; decide vs. Geist), and how they map to shadcn/ui tokens (`--primary`, `--card`, `--muted`, `--ring`, …) in light mode first with dark mode as an option

Data mapping: which value on screen comes from which mock function (`getMockDashboardSummary` for total responses and `4 /5`, `getMockActiveSurveys` + `getMockSurveyMetrics` for each card, `MOCK_CURRENT_USER` and `MOCK_CURRENT_ORGANIZATION` for the header and sidebar), and the exact shape the real metrics endpoint should keep so the UI does not change when Prisma replaces the mock

Discrepancies to resolve (recommend one option for each):

- Naming: the UI says "collections" ("New collection", "Your collections", "Active collections") but the overview and the data model say "surveys" (`/surveys`, "New survey")
- Language: the UI mixes English (sidebar, header, stats) and Spanish (cards); next-intl is not installed yet
- Reaction colors: the satisfaction card uses blue for "Muy bueno" and green for "Excelente", but the overview palette (single source of truth) uses `#84cc16` and `#22c55e`
- Poll colors: the screenshot paints every option purple, the overview defines fallback colors per option
- "Response rate" (68.4%) has no definition in the overview, and the "vs. last month" changes need a previous period that the mock does not generate
- The overview routes list `/dashboard` while the sidebar calls it "Overview"; confirm `/dashboard` and what `/` does (redirect or landing)
- The date in the screenshot (2024) vs. formatting the real date in the user's timezone

States and behavior: loading (skeletons for stats and cards), empty (no active surveys: only the CTA card), inactive survey badge, question with zero answers (bars at 0, share 0), survey with one question (no carousel), "Copiar Enlace" copies the public URL (`PANDA_PUBLIC_URL` + `/s?code=`) and shows a toast, "Ver / Editar" links to `/surveys/[id]`, search filters cards by name or code on the client, date range options (last 7 / 30 / 90 days, this month) kept in the URL as in the overview

Responsive and accessibility: sidebar becomes a `Sheet` drawer on mobile and can collapse to icons on desktop, stat cards stack on small screens, cards go to 1 column below `lg`, carousel works with keyboard (buttons with `aria-label`, `aria-current` on the active dot, arrow keys), bars expose their value (`role="progressbar"` or visible text), faces and stars have accessible names, focus states, reduced motion

Phases: propose how to split the work into feature specs, for example:

1. shadcn/ui init, theme tokens, dashboard layout (sidebar, top bar, placeholders)
2. Stat cards and "Your collections" header with search and date range
3. Survey card shell and the three category charts with the mock data
4. Empty/loading states, copy link toast, responsive and accessibility pass

Recommendation: the simplest approach that fits the project's patterns and coding standards

## Sources

- @context/project-overview.md
- @context/coding-standars.md
- @src/lib/mock-data.ts
- @src/types/survey.ts
- @src/app/layout.tsx
- @src/app/globals.css
- @context/screenshots/dashboard-preview.png
- @context/screenshots/dashboard-preview-2.png
- @context/screenshots/card-satisfaction.png
- @context/screenshots/card-rating.png
- @context/screenshots/card-poll.png
- shadcn/ui documentation (context7): `Sidebar`, `Card`, `Progress`, `Chart`, theming
- `node_modules/next/dist/docs/`
