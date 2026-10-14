# Dashboard Header Cleanup Spec

## Overview

Two changes to `/dashboard`:

- remove the three stat cards ("Total responses", "Active surveys", "Responses today") and everything only they use;
- fix the horizontal overflow of the "Your surveys" header when the sidebar is open (the page measures 976px at a 768px viewport).

Full research in `docs/dashboard-header-cleanup.md`.

## Decisions (from the research)

- **No stat cards.** The surveys section becomes the first block under the top bar. No replacement line for the active limit in this change.
- **Container queries, not viewport breakpoints**, for the section header and the toolbar, because the sidebar takes width from the content (same approach as the top bar and the surveys table).
- **Named container `@container/surveys`** so the toolbar classes only react to the section.
- **Keep `activeSurveyCount`** (empty state and card menu) and the `--highlight` tokens (used by `NewSurveyButton`).

## Requirements

### Remove the stat cards

- `src/app/(app)/dashboard/page.tsx`: remove `<StatCards …/>` and its import.
- Delete `src/components/dashboard/StatCards.tsx` and `StatCard.tsx`.
- `src/lib/dashboard.ts`: remove `summary` and `todayResponses` from `DashboardData` and `getDashboardData`, and the `getMockDashboardSummary`, `getTodayRange` and `DashboardSummary` imports.
- Delete `getMockDashboardSummary` (`src/lib/mock-data.ts`), `DashboardSummary` (`src/types/survey.ts`) and `getTodayRange` (`src/lib/date-range.ts`) after grepping that nothing else uses them; remove imports that become unused (`ACTIVE_SURVEY_LIMIT` in `mock-data.ts` only if unused).
- Messages: remove `dashboard.stats` (`totalResponses`, `activeSurveys`, `todayResponses`, `todayHint`, `remaining`) from **both** `en.json` and `es.json`.
- `scripts/check-contrast.mjs`: keep the `highlight-foreground` / `highlight` pair, change its note from "highlight card" to "New survey button".

### Header layout (`DashboardSection`)

- Section: `@container/surveys flex flex-col gap-6`.
- Header row: `flex flex-col gap-4 @3xl/surveys:flex-row @3xl/surveys:items-end @3xl/surveys:justify-between` (replaces the `sm:` classes).
- Title block: `min-w-0`; heading row `flex flex-wrap items-baseline gap-x-4 gap-y-1`; "View all" link gets `whitespace-nowrap`.
- The `h2` keeps its `ref`, `id`, `tabIndex={-1}` and focus ring (focus target after move to draft / delete).

### Toolbar (`CollectionsToolbar`)

- Root: `flex w-full flex-col gap-3 @md/surveys:flex-row @3xl/surveys:w-auto`.
- Search wrapper: `relative @md/surveys:flex-1 @3xl/surveys:flex-none`; input `w-full @3xl/surveys:w-60` (replaces `sm:w-60`).
- Select trigger: `w-full @md/surveys:w-48` (replaces `sm:w-48`).
- Result by section width: below 28rem everything stacks; 28–48rem title above and toolbar in one row (search grows); 48rem and up, one row as today.

### Skeleton (`DashboardSkeleton`)

- Remove the stat row (3 × `h-40`).
- Wrap the header and grid in `@container/surveys`; header bars (`h-8 w-48`, `h-4 w-72`) plus a toolbar shape (`h-11 rounded-full` search that grows + `h-11 w-48 rounded-full` select) using the same thresholds as the real header.

### Docs

- `docs/dashboard.md`: note at the "Stat cards" subsection that they were removed, pointing to `docs/dashboard-header-cleanup.md`.

## Verification

- `yarn lint` (message parity, contrast with the renamed note), `tsc --noEmit`, `yarn build` (`/dashboard` still partial prerender).
- No horizontal overflow (`scrollWidth === clientWidth`) at 375, 500, 640, 768, 1024 and 1280, with the sidebar open and collapsed, light / dark, English / Spanish.
- 768 with the sidebar open: title + "View all" on one line, subtitle, toolbar in one row below. 1280: header in one row as today.
- Search and range still update the URL; the range menu opens under its trigger in both layouts.
- Loading: skeleton without stat cards and no layout jump when content arrives.
- Move to draft / delete from a card still focus the "Your surveys" heading; the empty state still shows when no survey is active.

## References

- @docs/dashboard-header-cleanup.md
- @src/app/(app)/dashboard/page.tsx
- @src/components/dashboard/DashboardSection.tsx
- @src/components/dashboard/CollectionsToolbar.tsx
- @src/components/dashboard/DashboardSkeleton.tsx
- @src/lib/dashboard.ts
- @src/lib/mock-data.ts
- @src/lib/date-range.ts
- @src/types/survey.ts
- @scripts/check-contrast.mjs
