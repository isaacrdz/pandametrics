# Internationalization (i18n)

## Output

`docs/i18n.md`

## Research

Document how to add multi-language support with next-intl (the i18n library in the project overview stack), starting with English and Spanish, and a language switcher in the top bar. The result must be detailed enough to write a feature spec and migrate every existing string.

Product decisions: the URL never changes with the language (no `/en` or `/es` prefix), the choice is stored in the browser's `localStorage`, and the default language is English (`en`).

## Include

Current state: the UI is Spanish-only with `lang="es"` hardcoded in `src/app/layout.tsx`; copy lives in `COPY` constants or inline strings per component; formatting uses a fixed `es-MX` locale in `src/lib/format.ts`; range labels in `src/lib/date-range.ts`; reaction / rating labels in `src/lib/mock-data.ts`; no `messages/` folder, next-intl not installed. List every file with user-facing text, roughly how many strings each has, and whether it is a Server or Client Component:

- `src/app/layout.tsx` (metadata title and description, `lang`)
- `src/app/(app)/dashboard/page.tsx`
- `src/components/layout/`: `NavMain`, `NavUser`, `TopBar`, `Greeting`, `OrganizationSwitcher`
- `src/components/dashboard/`: `StatCards`, `StatCard`, `CollectionsToolbar`, `CopyButton`, `SurveyCard`, `SurveyGrid`, `SurveyResults`, `CreateSurveyCallout`, `EmptyState`, `DashboardSkeleton`, `MetricBar`, `charts.ts`
- `src/components/surveys/`: `StarRow`, `ReactionFace`
- `src/lib/format.ts`, `src/lib/date-range.ts`
- shadcn components with built-in English text (`sidebar.tsx` "Toggle Sidebar", `sheet.tsx` "Close", sr-only titles)

Locale in `localStorage`, with its consequences for this project:

- The server cannot read `localStorage`: what the server renders (HTML, metadata, Server Components) is always English; which components must become Client Components to show the chosen language, and how Server Components keep fetching data and pass it as props
- Flash of English on first load for browsers that chose Spanish, and how to avoid it (inline script in `<head>` before paint, like `next-themes`)
- Hydration without mismatches (`useSyncExternalStore` with a server snapshot of `en`), cross-tab sync (`storage` event), blocked or invalid storage
- Server-side text (Server Actions, route handlers, emails) cannot see the choice: how the client sends `locale`
- Interaction with `cacheComponents: true` and `partialPrefetching`: confirm there is no runtime data and the dashboard keeps its static shell
- Briefly, why the discarded options (locale in the URL, cookie) do not fit

Setup with next-intl without i18n routing, checked against the current next-intl docs (context7) and `node_modules/next/dist/docs/01-app/02-guides/internationalization.md`:

- Files: `src/i18n/config.ts` (locales, default, storage key), `src/i18n/request.ts` (server: always `en`), a client `LocaleProvider` wrapping `NextIntlClientProvider`, the inline script, `next.config.ts` plugin (`createNextIntlPlugin`), `src/messages/en.json` and `src/messages/es.json`
- Default locale (`en`) and fallback for missing or invalid stored values
- Client Components: `useTranslations`, `useFormatter`; bundling both message files vs. loading the second one on demand
- `lang` on `<html>` kept in sync on the client
- Metadata (server-rendered, English)
- TypeScript: typed message keys (`AppConfig` / `global.d.ts` augmentation) so a missing key fails `tsc`

Message organization:

- Namespaces by feature (`common`, `nav`, `topBar`, `dashboard`, `surveyCard`, `charts`, `dateRange`, `metadata`) and key naming convention
- ICU plurals and interpolation for the existing cases: "1 respuesta / N respuestas", "Queda 1 lugar / Quedan N lugares", "Pregunta 2 de 3", "N estrellas", greeting by time of day, "No encontramos encuestas con «{query}»"
- What is not translated: user content (survey names, questions, poll options, reaction labels stored in each `AnswerOption`), organization and user names. Decide how default reaction / rating labels are generated per locale when a survey is created
- A full key list for the current dashboard in both languages (English copy can follow the original screenshots: "Total responses", "Active surveys", "Your surveys", …), keeping "surveys" (not "collections")

Formatting:

- Replace `es-MX` in `src/lib/format.ts` with the active locale (`useFormatter` / `getFormatter` or `Intl` with the locale); decide `es` vs `es-MX` and `en` vs `en-US` for numbers (`3,062`), percentages and full dates
- Date range labels and the greeting moving to messages
- Timezone: keep it separate from the locale (the overview filters by an explicit IANA timezone)

Language switcher in the top bar:

- Component (`src/components/layout/LanguageSwitcher.tsx`), client, shadcn `DropdownMenu` + `Button` like `OrganizationSwitcher`: globe / languages icon, current language code or name, options "Español" / "English" written in their own language, check on the active one
- Placement between the organization switcher and "Nueva encuesta"; compact (icon only) on mobile
- How it changes the locale: write `localStorage` and re-render in place, with no navigation (path, search params and scroll are kept)
- Accessibility: `aria-label`, `lang` attribute on each option, focus states
- Per browser for now (`localStorage`); how a `User.locale` could be synced later

Migration plan:

- Order: install and configure, root layout and provider, Server → Client split, layout components, dashboard components, then `format.ts` / `date-range.ts`
- How to keep `COPY` constants from coming back (lint rule or review checklist), and how to test both languages (fresh browser in English, switch to Spanish, reload without flash, check no raw keys or leftovers)
- Changes needed in `context/coding-standars.md` (all user-facing text through next-intl, text rendered in Client Components) and `context/project-overview.md`

Recommendation: the simplest approach that fits the project's patterns, coding standards and Next.js 16 with Cache Components

## Sources

- @context/project-overview.md
- @context/coding-standars.md
- @next.config.ts
- @src/app/layout.tsx
- @src/app/(app)/layout.tsx
- @src/app/(app)/dashboard/page.tsx
- @src/components/layout/TopBar.tsx
- @src/components/layout/OrganizationSwitcher.tsx
- @src/lib/format.ts
- @src/lib/date-range.ts
- @src/lib/mock-data.ts
- @src/components/
- next-intl documentation (context7): App Router setup without i18n routing, `NextIntlClientProvider`, TypeScript, formatting
- `node_modules/next/dist/docs/01-app/02-guides/internationalization.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`
