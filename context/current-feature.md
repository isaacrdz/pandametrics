# Current Feature

<!-- Feature Name -->

## Status

<!-- Not Started|In Progress|Completed -->

## Goals

<!-- Goals & requirements -->

## Notes

<!-- Any extra notes -->

## History

<!-- Keep this updated. Earliest to latest -->

- **Init Project** (2026-10-13): cleaned the Create Next App boilerplate (index only shows an `h1` with "Panda Metrics"), moved `app/` to `src/app/` with `@/*` → `./src/*`, light theme by default with a `.dark` class, Geist font applied, removed boilerplate SVGs, new README, ignored `.claude/settings.local.json`, and connected `origin` to `git@github.com:Ellyonsoft/panda-metrics.git`
- **Dashboard View** (2026-10-13): shadcn/ui (Nova, Radix, Lucide) with Panda Metrics theme tokens, `next-themes` (light default) and sonner; app shell with collapsible sidebar (Dashboard, Encuestas, Historial, Configuración) and top bar; `/` redirects to `/dashboard`; stat cards (Respuestas totales, Encuestas activas, Respuestas hoy), search and date range in the URL inside `Suspense`, skeletons and empty states; survey cards with question carousel and Satisfaction / Rating / Poll charts, icon buttons to copy link, copy code and edit; data from `src/lib/mock-data.ts` through `src/lib/dashboard.ts`
