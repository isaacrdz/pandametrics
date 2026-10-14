# Dashboard Header Cleanup

## Output

`docs/dashboard-header-cleanup.md`

## Research

Document two changes to `/dashboard`:

1. **Fix the horizontal overflow at 768px with the sidebar open.** The page measures 976px wide in a 768px viewport. The elements that pass the right edge are the "Your surveys" toolbar (search input + date range select) in `DashboardSection` / `CollectionsToolbar`. The "View all" link also wraps to two lines next to the heading.
2. **Remove the three stat cards** above the surveys section: "Total responses" (highlighted), "Active surveys" (`4 /5` + spots remaining) and "Responses today".

The result must be detailed enough to write one feature spec.

## Include

Current state:

- `src/app/(app)/dashboard/page.tsx`: `DashboardTitle` (sr-only `h1`), then inside `Suspense` `StatCards` + `DashboardSection`, then `CreateSurveyCallout` and `DashboardFooter`.
- `DashboardSection` header: `flex-col` below `sm`, `sm:flex-row sm:justify-between` above, with the title block (`h2` + "View all" link + subtitle) on the left and `CollectionsToolbar` on the right (search `sm:w-60` + select `sm:w-48`, side by side from `sm`).
- The breakpoints are viewport-based, but the sidebar (16rem expanded, 3rem collapsed, a sheet below `md`) takes width from the content.
- The table page (`/surveys`) and the top bar already use container queries for the same reason.
- What the stat cards depend on: `StatCards`, `StatCard`, `DashboardData.summary` and `todayResponses` in `src/lib/dashboard.ts`, `getMockDashboardSummary`, `getTodayRange`, `DashboardSummary`, `dashboard.stats.*` messages, the `DashboardSkeleton` stat row, the `highlight` contrast pair (also used by `NewSurveyButton`).

What to define:

- The exact width math at 768px (sidebar open and collapsed) and which other widths overflow.
- Layout fix: container queries on the section, thresholds, classes for the header, toolbar, input and select, and the "View all" wrap.
- What is removed and what stays (`activeSurveyCount` is still needed for the empty state and the card menu).
- What information disappears with the stat cards and where it can still be seen.
- Skeleton, messages, contrast check, docs and overview updates.
- Verification: no overflow at 375 / 500 / 640 / 768 / 1024 / 1280, sidebar open and collapsed, light / dark, en / es.

## Sources

- @src/app/(app)/dashboard/page.tsx
- @src/components/dashboard/DashboardSection.tsx
- @src/components/dashboard/CollectionsToolbar.tsx
- @src/components/dashboard/StatCards.tsx
- @src/components/dashboard/StatCard.tsx
- @src/components/dashboard/DashboardSkeleton.tsx
- @src/lib/dashboard.ts
- @src/lib/mock-data.ts
- @src/lib/date-range.ts
- @src/components/surveys/table/SurveysTableSection.tsx
- @src/components/layout/TopBar.tsx
- @scripts/check-contrast.mjs
- @docs/dashboard.md
- @docs/survey-card.md
