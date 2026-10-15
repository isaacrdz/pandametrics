# Top Bar Phase 1 — Infrastructure and Lists Spec

## Overview

Phase 1 of 3 of the contextual top bar: the top bar becomes the page header.

- Shared pieces: `AppShellProvider`, `AppTopBar`, `PageHeading`.
- Each admin page renders its own top bar; the layout no longer renders `TopBar`.
- Dashboard: no visible change.
- Survey list and user list: their heading moves into the bar.

Phase 2 moves the survey form and phase 3 the user forms and the profile. Until then, the form pages render `AppTopBar` with today's greeting and "New survey" (no visible change) and keep their `FormHeader`. Full research in `docs/contextual-top-bar.md`.

## Decisions (from the research)

- **Each page renders the bar**, outside its `max-w` container and outside Suspense when the title does not depend on data. No parallel routes, portals or context-driven titles (they render the title late or cannot reach form state).
- **The layout provides global data** (user, organizations, current organization) through `AppShellProvider`; `AppTopBar` reads it.
- **One `h1` per page**: in the bar for every view except the dashboard (sr-only `h1`, greeting stays a paragraph).
- **Primary action on the right**: "New survey" on the dashboard and the survey list, "New user" on the user list, after the organization and language switchers.
- **The survey date range select moves into the table toolbar.**

## Requirements

### Shared pieces (`src/components/layout/`)

- `AppShellProvider` (client): context with `user`, `organizations`, `currentOrganizationId`; `useAppShell()` hook. `(app)/layout.tsx` wraps `SidebarInset` children with it (data from `getAppContext()`) and no longer renders `TopBar`.
- `AppTopBar` (client): the current bar's markup (sticky `@container`, 80px, `border-b`, blurred background, `px-4 md:px-8`): mobile `SidebarTrigger`, `heading` slot (left, `min-w-0 flex-1`), then `OrganizationSwitcher`, `LanguageSwitcher` and the `actions` slot. Props: `heading: ReactNode`, `actions?: ReactNode`.
- `PageHeading` (client): `title` (rendered as `h1`, `truncate`, `text-xl @3xl:text-2xl font-semibold`, with `title` attribute), optional `count` (muted, `tabular-nums`), optional `subtitle` (`text-sm text-muted-foreground truncate`, hidden below `@md`), optional `back` (`href` or `onClick`) rendered as an icon button (`ArrowLeftIcon`, label `form.actions.back`, tooltip) before the title.
- `TopBar.tsx` is deleted; `Greeting` and `NewSurveyButton` are reused.

### Dashboard

- `dashboard/page.tsx` renders `<AppTopBar heading={<Greeting …/>} actions={<NewSurveyButton />} />` before its container (outside Suspense). The greeting reads the user name from `useAppShell()`.
- No visible change (compare screenshots before / after at 375 / 768 / 1280).

### Survey list (`/surveys`)

- Page renders `SurveysTopBar` (client) before the container: `PageHeading` with title `surveys.title` ("All surveys"), subtitle `surveys.subtitle`, and `actions={<NewSurveyButton />}`.
- Count: rendered in a nested Suspense inside the heading (fallback: an empty span with the same width as two digits), from the same `listSurveys` data. If that is awkward, keep the count out of the bar (the toolbar already says "Showing 1–5 of 8"); document the choice.
- `SurveysTableSection`: remove the heading block (h1, count, subtitle). The date range select moves into `SurveysToolbar`, before Type and Status, with its `CalendarIcon`; it keeps `?range=` and the "range is not a filter" behavior (Clear filters keeps it). On narrow cards it takes a full row like the other filters.
- `SurveysTableSkeleton`: remove the heading bars; add the range block in the toolbar skeleton.
- The `aria-labelledby` of the section points to the bar's `h1` (stable id `page-title`), or becomes an `aria-label`.

### User list (`/users`)

- Page renders `UsersTopBar` (client): `PageHeading` with `users.title`, count (same approach as surveys), `users.subtitle`; `actions` = "New user" (primary, `PlusIcon`, link to `/users/new`, label hidden below `@3xl` with `aria-label`), styled like `NewSurveyButton`.
- `UsersTableSection` and `UsersTableSkeleton`: remove the heading block and the "New user" button from the content.

### Form pages (temporary, until phases 2 and 3)

- `/surveys/new`, `/surveys/[id]`, `/users/new`, `/users/[id]`, `/profile` render `<AppTopBar heading={<Greeting/>} actions={<NewSurveyButton/>} />` so they look exactly as today; their `FormHeader` stays.

### Overview

- `context/project-overview.md` already has the rule (section 9 "Top bar as the page header"); update it if anything in this phase differs.

## Verification

- `yarn lint`, `tsc --noEmit`, `yarn build`: same static / partial prerender kinds per route as before.
- Dashboard and form pages look the same as before (screenshots at 375 / 768 / 1280, light and dark).
- `/surveys`: the bar shows "All surveys" (+ count) and the subtitle; "New survey" on the right; no heading in the content; the range select in the toolbar changes `?range=` and survives "Clear filters"; skeleton matches.
- `/users`: the bar shows "Users" (+ count) and the subtitle with "New user"; no heading in the content.
- No flicker of the bar on load and on navigation between dashboard, surveys and users.
- One `h1` per page; the bar's controls have names; the subtitle hides on phones and the title truncates.
- 375 / 768 / 1024 / 1280 with the sidebar open and collapsed, English and Spanish: no overflow.

## References

- @docs/contextual-top-bar.md
- @src/app/(app)/layout.tsx
- @src/components/layout/TopBar.tsx
- @src/components/layout/Greeting.tsx
- @src/components/layout/NewSurveyButton.tsx
- @src/components/surveys/table/SurveysTableSection.tsx
- @src/components/surveys/table/SurveysToolbar.tsx
- @src/components/users/table/UsersTableSection.tsx
- @context/project-overview.md
