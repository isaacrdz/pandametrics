# Dashboard Header Cleanup

Two changes to `/dashboard`:

1. Fix the horizontal overflow of the "Your surveys" header when the sidebar is open (found at 768px during the Survey Card Redesign review).
2. Remove the three stat cards: "Total responses", "Active surveys" and "Responses today".

## 1. Current state

`src/app/(app)/dashboard/page.tsx`:

```
DashboardTitle            sr-only h1
Suspense
  StatCards               3 cards, grid-cols-1 sm:grid-cols-3
  DashboardSection        "Your surveys" header + SurveyGrid
CreateSurveyCallout
DashboardFooter
```

`DashboardSection` header:

```tsx
<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
  <div>
    <div className="flex items-baseline gap-4">
      <h2>…Your surveys</h2>
      <Link>View all →</Link>
    </div>
    <p>A snapshot of how your customers are feeling.</p>
  </div>
  <CollectionsToolbar />   // flex w-full flex-col gap-3 sm:w-auto sm:flex-row
                           // search: w-full sm:w-60 · select: w-full sm:w-48
</div>
```

`CollectionsToolbar` is only used by `DashboardSection`.

## 2. The overflow

### Why it happens

The header switches to a row at `sm` (640px **viewport**), but the space it gets is the viewport minus the sidebar:

| Viewport | Sidebar | Content width (`md:px-8`) | Toolbar in a row | Result |
| --- | --- | --- | --- | --- |
| 375 | sheet (hidden) | 343 | no (below `sm`) | OK |
| 640 | sheet (hidden, below `md`) | 608 (`px-4`) | 240 + 12 + 192 = 444 | Fits, title block squeezed to ~150px |
| 768 | open, 16rem | 768 − 256 − 64 = **448** | 444 + title block | **Overflow** (page 976px wide) |
| 768 | collapsed, 3rem | 768 − 48 − 64 = 656 | 444 | Fits, title squeezed, "View all" wraps |
| 1024 | open | 704 | 444 | Fits, subtitle wraps |
| 1280 | open | 960 | 444 | OK |

At 768px with the sidebar open, the title block and the toolbar need about 650px together and get 448px. The search and select have fixed widths (`sm:w-60`, `sm:w-48`), so they cannot shrink and push past the right edge. The "View all" link also breaks into "Ver / todas" because the heading row has no `whitespace-nowrap`.

The surveys table (`/surveys`) has the same header pattern but only a 192px select, so it fits. The top bar and the table card already use container queries for this reason (the sidebar makes viewport breakpoints wrong).

### Fix: container queries on the section

Use the section's own width, not the viewport:

```tsx
// DashboardSection
<section aria-labelledby="surveys-title" className="@container/surveys flex flex-col gap-6">
  <div className="flex flex-col gap-4 @3xl/surveys:flex-row @3xl/surveys:items-end @3xl/surveys:justify-between">
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 …>…</h2>
        <Link className="… whitespace-nowrap">…</Link>
      </div>
      <p …>…</p>
    </div>
    <CollectionsToolbar … />
  </div>
  …
</section>
```

```tsx
// CollectionsToolbar
<div className="flex w-full flex-col gap-3 @md/surveys:flex-row @3xl/surveys:w-auto">
  <div className="relative @md/surveys:flex-1 @3xl/surveys:flex-none">
    <Input className="… w-full @3xl/surveys:w-60" />
  </div>
  <SelectTrigger className="… w-full @md/surveys:w-48" />
</div>
```

Resulting layouts, by section width:

| Section width | Header | Toolbar |
| --- | --- | --- |
| < 28rem (448px) | stacked | search and select stacked, full width |
| 28rem – 48rem (448–768px) | stacked: title above, toolbar below | one row: search grows, select 12rem |
| ≥ 48rem (768px) | one row: title left, toolbar right | search 15rem + select 12rem |

So 768px with the sidebar open (448px section) gets a stacked header and a one-row toolbar; 1280px keeps today's look.

Notes:

- Named container (`/surveys`) so the classes inside `CollectionsToolbar` never match another container by accident.
- `min-w-0` on the title block and `flex-wrap` on the heading row so a long translated title can never push the page wider.
- No change to `SelectContent align="end"`: in the stacked layout the menu still opens under the trigger.

## 3. Removing the stat cards

### What goes away

| Item | Action |
| --- | --- |
| `<StatCards …/>` in `page.tsx` | Remove |
| `src/components/dashboard/StatCards.tsx`, `StatCard.tsx` | Delete |
| `DashboardData.summary`, `DashboardData.todayResponses` in `src/lib/dashboard.ts` | Remove, with the `getMockDashboardSummary` and `getTodayRange` imports |
| `getMockDashboardSummary` in `src/lib/mock-data.ts` | Delete (no other users) |
| `DashboardSummary` in `src/types/survey.ts` | Delete (only the summary uses it) |
| `getTodayRange` in `src/lib/date-range.ts` | Delete (only the summary uses it) |
| `dashboard.stats.*` in `en.json` and `es.json` (`totalResponses`, `activeSurveys`, `todayResponses`, `todayHint`, `remaining`) | Remove from both (parity check) |
| Stat row in `DashboardSkeleton` (3 × `h-40`) | Remove |

### What stays

- `activeSurveyCount` in `DashboardData`: the empty state ("You don't have active surveys yet") and the card menu (`activeCount`) need it.
- `--highlight` / `--highlight-foreground` tokens and their contrast pair: `NewSurveyButton` uses them. Rename the pair's note in `check-contrast.mjs` from "highlight card" to "New survey button".
- `CopyButton`, `CreateSurveyCallout`, footer: unchanged.

### What information is lost, and where it still lives

| Stat | Still visible |
| --- | --- |
| Total responses in the range | Per survey, in each card's pager ("… · 1,842 responses"); per survey in the `/surveys` table. No dashboard-wide total. |
| Active surveys `4 / 5` and spots remaining | Number of cards on the dashboard; "N of 5 active" hint in the table menu for drafts; the `ACTIVE_LIMIT` error when the limit is reached. |
| Responses today | Nowhere. Choosing "Today" in the range select shows today's count per survey. |

If the team later wants the limit back without the cards, a muted line in the section subtitle ("4 of 5 active surveys") is the smallest option. Not part of this change.

### Page after the change

```
DashboardTitle (sr-only h1)
Suspense
  DashboardSection        header + grid (first thing on screen)
CreateSurveyCallout
DashboardFooter
```

- The page keeps `gap-10`; the section becomes the first visible block, right under the top bar.
- Heading order stays valid: `h1` (sr-only) → `h2` "Your surveys" → `h3` card titles. The stat cards' `h2`s go away.
- `/dashboard` keeps its static shell: the data still comes from `searchParams` inside `Suspense`.

### Skeleton

`DashboardSkeleton` starts with the section header (title + subtitle bars) and adds the toolbar shape so the layout does not jump:

```
[h-8 w-48]                         (stacked below @3xl, right side above)
[h-4 w-72]
[h-11 rounded-full flex-1] [h-11 rounded-full w-48]
[card] [card]
```

Wrap it in the same `@container/surveys` so the skeleton toolbar follows the same thresholds.

## 4. Docs

- `docs/dashboard.md`: add a note at the stat cards section (2. Screen description → "Stat cards") saying they were removed, pointing here.
- `context/project-overview.md`: no dashboard stat requirement exists there (the "Survey card requirements" keep the per-survey total), so no change.

## 5. Verification

- `yarn lint` (messages parity, contrast with the renamed note), `tsc --noEmit`, `yarn build` (`/dashboard` still `◐`).
- No horizontal overflow (`scrollWidth === clientWidth`) at 375, 500, 640, 768, 1024 and 1280, with the sidebar open and collapsed, light and dark, English and Spanish.
- At 768 with the sidebar open: title and "View all" on one line, subtitle below, toolbar in one row under it.
- At 1280: header in one row as today.
- Search and range still update the URL; the range menu opens under its trigger in both layouts.
- Loading state: skeleton without stat cards, no layout jump when the content arrives.
- Move to draft / delete from a card still focus the "Your surveys" heading, which is now the first heading on screen.

## 6. Recommendation

One small spec, **Dashboard Header Cleanup**:

1. Remove the stat cards and everything only they use (component, data, mock helper, type, `getTodayRange`, messages, skeleton row); rename the contrast note.
2. Container queries on `DashboardSection` and `CollectionsToolbar` (`@md/surveys`, `@3xl/surveys`), `min-w-0`, `flex-wrap` and `whitespace-nowrap` on "View all".
3. Skeleton with the toolbar shape inside the same container.
4. Docs note and the width checks above.
