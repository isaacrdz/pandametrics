# Current Feature: Dashboard View

## Status

In Progress

## Goals

### Phase 1: Shell

- shadcn/ui initialized (Tailwind v4, `src/components/ui`, `src/lib/utils.ts`) with `button card input select avatar dropdown-menu separator sidebar sheet tooltip skeleton progress badge sonner`; `lucide-react` and `next-themes` installed
- `ThemeProvider` (light default, no system) and `<Toaster />` in the root layout; `lang="es"`
- Theme tokens from the spec in `src/app/globals.css` (light and `.dark`), including `--highlight`, `--card-border`, `--success`, `--success-foreground`, reaction and star colors
- `/` redirects to `/dashboard`
- `src/app/(app)/layout.tsx` with `SidebarProvider`, `AppSidebar` (Dashboard, Encuestas, Historial, Configuración, user card, `collapsible="icon"`) and sticky `TopBar` (`Greeting`, `OrganizationSwitcher`, "Nueva encuesta")

### Phase 2: Summary and toolbar

- `src/lib/dashboard.ts` with `getDashboardData(organizationId, range)` backed by the mock
- `StatCards`: "Respuestas totales" (highlighted), "Encuestas activas" (`4 /5` + remaining spots), "Respuestas hoy"
- "Tus encuestas" header with `CollectionsToolbar` (search `?q=`, range `?range=7d|30d|90d|month`)
- `searchParams` read inside `<Suspense>` with `Skeleton` fallback and `dashboard/loading.tsx`
- `CreateSurveyCallout` and footer

### Phase 3: Survey cards

- `SurveyGrid` (1 column, 2 from `lg`) filtered by `?q=`
- `SurveyCard` with "Copiar enlace" (`CopyLinkButton` + toast) and "Ver / Editar" (`/surveys/[id]`)
- `SurveyResults` carousel (code, status, question header, chart, total)
- `MetricBar`, `SatisfactionChart` + `ReactionFace`, `RatingChart` + `StarRow` (average in the header), `PollChart`

### Phase 4: States, responsive and accessibility

- Empty state, no-results state, zero answers, archived options "(eliminada)"
- Mobile: `Sheet` drawer, stacked stat cards, scaled faces, icon "Nueva encuesta"
- Keyboard carousel and `aria` labels, focus rings, `motion-safe:` animations
- Dark mode tokens checked and theme toggle

### Verification

- `yarn lint` and `yarn build` pass; no `tailwind.config.*`
- Values match the mock: 3,062 total, 4 / 5 active, STORE7 1,842, EVENT2 788, PROD91 348 (avg 4.1), HELP44 84; 5XS1NK hidden
- Range and search update the cards; no `blocking-route` / `blocking-prerender-current-time` warnings

## Notes

- Spec: `context/features/dashboard-view-spec.md`. Research with design details, tokens and component table: `docs/dashboard.md`
- Screenshots: `context/screenshots/dashboard-preview.png`, `dashboard-preview-2.png`, `card-satisfaction.png`, `card-rating.png`, `card-poll.png`
- Decisions: "encuestas" everywhere (not collections), Spanish copy kept in a constant per component, overview reaction palette (not the screenshot blue), poll bars in `--primary`, "Response rate" replaced by "Respuestas hoy", no "vs. mes anterior" lines, Geist font, light mode first
- `cacheComponents: true`: `searchParams` and anything using the current time must be inside `<Suspense>` or in client components; `SidebarProvider` uses `defaultOpen` (no cookie read yet)
- Only `NavMain`, `Greeting`, `OrganizationSwitcher`, `CollectionsToolbar`, `SurveyResults` and `CopyLinkButton` are client components; charts have no hooks
- Option colors come from the data via a `--bar-color` custom property (only allowed exception to "no inline styles")
- Data access goes through `src/lib/dashboard.ts` only, so Prisma later replaces one file
- Recommended: implement and review one phase at a time

## History

<!-- Keep this updated. Earliest to latest -->

- **Init Project** (2026-10-13): cleaned the Create Next App boilerplate (index only shows an `h1` with "Panda Metrics"), moved `app/` to `src/app/` with `@/*` → `./src/*`, light theme by default with a `.dark` class, Geist font applied, removed boilerplate SVGs, new README, ignored `.claude/settings.local.json`, and connected `origin` to `git@github.com:Ellyonsoft/panda-metrics.git`
