# Dashboard View Spec

## Overview

Build the admin dashboard at `/dashboard` following the design screenshots: app shell (sidebar + top bar), summary stat cards, the "Tus encuestas" section with search and date range, and one result card per active survey with its category chart (Satisfaction, Rating, Poll). Data comes from `src/lib/mock-data.ts` until Prisma exists. Full research and design details in `docs/dashboard.md`.

The work is split in 4 phases. Each phase can be loaded as its own feature (`/feature load` with the phase) or implemented in order within this one.

## Decisions (from the research)

- **Surveys, not collections**: all copy, routes and code say "encuesta" / `survey` (`/surveys`, "Nueva encuesta", "Tus encuestas", "Encuestas activas")
- **Spanish UI** for now; set `lang="es"` in `src/app/layout.tsx`. Keep each component's copy in a constant at the top of the file so it moves to next-intl later
- **Reaction colors** from the overview palette (`REACTION_OPTIONS` in the mock), not the blue of the screenshot
- **Poll bars** all in `--primary`, as in the screenshot
- **"Response rate" card is replaced** by "Respuestas hoy" (responses of active surveys on `MOCK_NOW`'s day). The "vs. mes anterior" change lines are hidden until the mock has a previous period
- **Font**: keep Geist (Geist Mono for `código:`)
- **Light mode first**, dark mode as an option (`next-themes`, `defaultTheme="light"`, `enableSystem={false}`)

## Phase 1: Shell

- `npx shadcn@latest init` (Tailwind v4, CSS variables, components in `src/components/ui`, `cn` in `src/lib/utils.ts`). No `tailwind.config.*`
- Install components: `button card input select avatar dropdown-menu separator sidebar sheet tooltip skeleton progress badge sonner`
- Add `lucide-react` and `next-themes`; `ThemeProvider` and `<Toaster />` in the root layout
- Theme tokens in `src/app/globals.css` (section 5 of the research): `--background #f8f8fc`, `--foreground #2f3241`, `--card #ffffff`, `--muted #f1f1f5`, `--muted-foreground #6b7080`, `--border #e7e7ef`, `--primary #6439c4`, `--accent #efedfd`, `--accent-foreground #5b46d6`, `--ring #8b7cf0`, sidebar tokens, plus custom `--highlight #5d62d6`, `--card-border #ddd4f6`, `--success #5fa04e`, `--success-foreground #3d7a32`, reaction and star colors, `--radius: 1rem`. Same tokens under `.dark`
- `src/app/page.tsx` redirects to `/dashboard`
- Route group `src/app/(app)/layout.tsx` with `SidebarProvider` (`defaultOpen`, no cookie read yet), `AppSidebar` and `TopBar`
- `AppSidebar` (`src/components/layout/`): logo tile with sparkle icon + "panda metrics" + collapse button (`collapsible="icon"`); group "ESPACIO DE TRABAJO" with Dashboard (`/dashboard`), Encuestas (`/surveys`), Historial (`/history`); separator; group "ADMINISTRAR" with Configuración (`/settings`); `NavUser` footer (initials avatar, name, email from `MOCK_CURRENT_USER`). Active item: accent pill, primary text and a dot (`NavMain`, client, `usePathname`). Items without a page yet are shown disabled
- `TopBar`: `Greeting` (client: local date "lunes, 13 de octubre de 2026" and "Buenos días / Buenas tardes / Buenas noches, Jordan"), `OrganizationSwitcher` (client, `DropdownMenu` with `MOCK_ORGANIZATIONS`, green dot), "Nueva encuesta" primary button with plus icon linking to `/surveys/new`, `SidebarTrigger` on mobile. Sticky with bottom border
- `/dashboard` page with `h2` placeholders "Resumen" and "Tus encuestas"

## Phase 2: Summary and toolbar

- `src/lib/dashboard.ts` (server-only) with `getDashboardData(organizationId, range)` returning `{ summary, todayResponses, cards: { survey, metrics }[] }` from the mock helpers
- `StatCards` / `StatCard` (`src/components/dashboard/`), 3 columns:
  - "Respuestas totales": highlighted card (`bg-highlight`, white text, colored shadow), bar chart icon, value formatted with `Intl.NumberFormat`
  - "Encuestas activas": `4` + `/5` muted, hint in `text-success-foreground` ("Queda 1 lugar" / "Quedan N lugares" / "Límite alcanzado")
  - "Respuestas hoy": value and users icon
- Section header: "Tus encuestas", subtitle "Así se sienten tus clientes."
- `CollectionsToolbar` (client): search input "Buscar encuestas" (`?q=`, debounced `router.replace`) and `Select` for the range "Últimos 7 días / Últimos 30 días / Últimos 90 días / Este mes" (`?range=7d|30d|90d|month`, default `30d`)
- Page reads `searchParams` (a `Promise`) inside `<Suspense>`; fallback and `dashboard/loading.tsx` use `Skeleton` with the real layout (required by `cacheComponents: true`)
- `CreateSurveyCallout`: "¿Tienes otra pregunta en mente?", "Crea una encuesta y empieza a recibir opiniones.", outline "Crear encuesta" button with chevron → `/surveys/new`
- Footer: "Panda Metrics · Tus opiniones, medibles"

## Phase 3: Survey cards

- `SurveyGrid`: `grid-cols-1 lg:grid-cols-2`, one `SurveyCard` per active survey, filtered by `?q=` (name or code, case and accent insensitive)
- `SurveyCard` (server): outer card (`rounded-3xl`, `border-card-border`), name, description, `CopyLinkButton` "Copiar enlace" (outline) and "Ver / Editar" (primary, `Link` to `/surveys/[id]`)
- `CopyLinkButton` (client): copies `${PANDA_PUBLIC_URL}/s?code=${code}` and shows `toast.success("Enlace copiado")` / `toast.error`
- `SurveyResults` (client): inner panel with `código: XXXXXX` (mono), status dot + "Activa" / "Inactiva", "Resumen de respuestas", carousel (prev / next buttons, one dot per question, active dot wider and primary; hidden with one question), question header "1. …" + "N respuestas", chart, separator, "Respuestas totales" + bold total
- `MetricBar`: track `bg-muted`, fill width = `share`, color from the option (`--bar-color` custom property), `aria-label` "Label: N respuestas (P%)"
- `SatisfactionChart`: row of 5 `ReactionFace` (SVG in `src/components/surveys/`, tinted circle, colored border and glow) with labels, then 5 rows of dot + label + `MetricBar` + count
- `RatingChart`: 5 rows of `StarRow` (1 to 5 amber stars) + `MetricBar` (star color) + count; average shown in the question header (`★ 4.1 · 348 respuestas`)
- `PollChart`: one accent block per option with label, "N respuestas" in bold primary and a primary `MetricBar` below
- Charts have no hooks so they can be reused in server pages

## Phase 4: States, responsive and accessibility

- Empty state when there are no active surveys ("Todavía no tienes encuestas activas") and no-results state for the search with a "Limpiar búsqueda" button
- Questions with zero answers (bars at 0), archived options with answers shown last as "(eliminada)" and muted
- Mobile: sidebar as `Sheet` drawer, stat cards `grid-cols-1 sm:grid-cols-3`, faces scaled (`size-14 sm:size-20`), card buttons wrap, "Nueva encuesta" as icon button with `aria-label`
- Carousel keyboard support: `aria-label` on buttons, `aria-current` on the active dot, Left / Right arrows, `aria-live="polite"` for the question title
- Faces and stars `aria-hidden` with visible or `sr-only` labels; focus rings with `--ring`; animations under `motion-safe:`
- Dark mode tokens checked and a theme toggle in the user menu

## Verification

- `yarn lint` and `yarn build` pass; no `tailwind.config.*`
- `/` redirects to `/dashboard`
- Values match the mock: Respuestas totales 3,062, Encuestas activas 4 / 5, cards STORE7 (1,842), EVENT2 (788), PROD91 (348, average 4.1), HELP44 (84); 5XS1NK does not appear (inactive)
- Changing the range to 7 or 90 days updates totals and bars; searching "prod" leaves only Product feedback
- No `blocking-route` or `blocking-prerender-current-time` warnings in the dev overlay
- Layout matches the screenshots in light mode; keyboard can reach and operate every control

## References

- @docs/dashboard.md
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
