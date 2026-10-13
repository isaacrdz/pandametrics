# Dashboard

How to build the admin dashboard at `/dashboard` from the preview screenshots, including the three survey result cards (Satisfaction, Rating, Poll), with shadcn/ui, Tailwind v4 and the mock data in `src/lib/mock-data.ts` until Prisma exists.

Researched on 2026-10-13 against `main` at `914292b` plus the uncommitted `src/lib/mock-data.ts` and `src/types/survey.ts`.

## 1. Current state

### Code

| File | What it has |
| ---- | ----------- |
| `src/app/page.tsx` | Server Component with only `<h1>Panda Metrics</h1>` |
| `src/app/layout.tsx` | Geist + Geist Mono, metadata "Panda Metrics", `lang="en"`, `body.min-h-full.flex.flex-col` |
| `src/app/globals.css` | `@import "tailwindcss"`, `--background` / `--foreground` in `:root` (light) and `.dark`, `@theme inline` for colors and fonts |
| `src/types/survey.ts` | Types that mirror the Prisma schema (`Organization`, `User`, `Survey`, `Question`, `AnswerOption`, `SurveyResponse`, `ResponseItem`) and the computed metrics (`DateRange`, `OptionMetrics`, `QuestionMetrics`, `SurveyMetrics`, `DashboardSummary`) |
| `src/lib/mock-data.ts` | Deterministic mock data (fixed `MOCK_NOW`, seeded PRNG) and metric helpers |

Not installed yet: shadcn/ui (and its `components.json`, `cn` helper, `tw-animate-css`), `next-themes`, `lucide-react`, `sonner`. There is no `/dashboard` route, no `src/components/`, and nothing at `/` besides the title.

### What the mock provides

| Export | Content |
| ------ | ------- |
| `MOCK_NOW` | `2026-10-13T18:00:00Z`, the "today" of the mock |
| `MOCK_ORGANIZATIONS`, `MOCK_CURRENT_ORGANIZATION` | Acme Inc. (4 active surveys) and Panda Labs (empty) |
| `MOCK_USERS`, `MOCK_CURRENT_USER` | Jordan Davis (OWNER, `jordan@acme.co`), Ana López (ADMIN) |
| `MOCK_SURVEYS` | STORE7 and EVENT2 (Satisfaction), PROD91 (Rating), HELP44 (Poll), all active; 5XS1NK (Satisfaction, inactive). Two questions each |
| `MOCK_RESPONSES` | 3,071 responses with snapshot items, `source`, `deviceId`, `locale`, `durationMs` |
| `LAST_30_DAYS` | Default `DateRange` |
| `getMockActiveSurveys(orgId?)` | Active, not deleted surveys of the organization |
| `getMockSurveyMetrics(surveyId, range?)` | `SurveyMetrics`: total responses and, per question, `totalAnswers`, `average` (Rating only) and per option `count` / `share` / `archived` |
| `getMockDashboardSummary(orgId?, range?)` | `{ totalResponses: 3062, activeSurveys: 4, activeSurveyLimit: 5 }` |
| `REACTION_OPTIONS`, `RATING_COLORS`, `POLL_FALLBACK_COLORS`, `ACTIVE_SURVEY_LIMIT` | Constants from section 11 of the overview |

Card values from the mock in the last 30 days:

| Code | Category | Total | Question 1 counts | Question 2 counts |
| ---- | -------- | ----- | ----------------- | ----------------- |
| STORE7 | Satisfaction | 1,842 | 64 / 118 / 296 / 602 / 762 | 92 / 154 / 388 / 571 / 637 |
| EVENT2 | Satisfaction | 788 | 21 / 43 / 132 / 270 / 322 | 35 / 58 / 171 / 244 / 280 |
| PROD91 | Rating | 348 (avg 4.1) | 12 / 18 / 46 / 108 / 164 | 9 / 22 / 61 / 121 / 135 (avg 4.0) |
| HELP44 | Poll | 84 | 34 / 26 / 18 / 6 | 41 / 27 / 16 |
| 5XS1NK | Satisfaction (inactive) | 0 (its 9 responses are 40 to 70 days old) | | |

## 2. Screen description

The dashboard is a two-column app shell: a fixed sidebar (~280px) and a scrolling main area on a very light lavender-gray background.

### Sidebar

- **Header**: logo tile (40px purple rounded square with a white sparkle icon), "panda metrics" in bold, and a collapse button (panel icon) on the right.
- **WORKSPACE** (small uppercase, letter-spaced, muted): Overview, Collections, History. Each item is an outline icon + label. The active item (Overview) has a light purple pill background, purple text and icon, and a small purple dot on the right.
- Divider.
- **MANAGE**: Settings.
- **Footer**: user card on a light gray rounded background: initials avatar ("JD", purple on light purple), name in bold, email muted.

### Top bar

- Left: date in small muted text ("Monday, October 14, 2024") and a greeting in large semibold ("Good morning, Jordan").
- Right: organization switcher (white pill with border, green dot, "Acme Inc.", chevron) and the primary "New collection" button (indigo, white text, plus icon, rounded, soft shadow).
- A bottom border separates it from the content; it stays visible while the content scrolls (`preview-2` shows it fixed over the cards).

### Stat cards (3 equal columns)

| Card | Style | Content |
| ---- | ----- | ------- |
| Total responses | Solid indigo background, white text, large shadow | Label, bar chart icon, value `3,062`, `+14.2% vs. last month` (percentage bold) |
| Active collections | White, border | Label, clipboard icon, `4` large + `/5` muted, hint in green ("One spot remaining") |
| Response rate | White, border | Label, users icon, `68.4%`, `+4.8% this month` in green |

Rounded corners (~16px), generous padding, icons outlined in the top right.

### "Your collections"

- Title "Your collections" (bold, ~28px) and subtitle "A snapshot of how your customers are feeling." (muted).
- Right: search input with a magnifier icon ("Search collections") and a date range select (purple dot, "Last 30 days", chevron), both as white pills with a border.
- Below: survey cards in a 2-column grid with ~32px gap.

### Call to action and footer

- "Have another question in mind?" card: full width, soft border, plus icon in a light purple tile, title bold, subtitle "Create a collection and start collecting feedback.", outline "Create collection" button with a chevron on the right.
- Footer: centered small muted text "Panda Metrics · Your feedback, made measurable".

## 3. Survey card design

All three cards share one shell; only the chart inside the results panel changes.

```
┌ Outer card (white, lavender border, radius ~24px) ───────────────────────┐
│ Survey name (bold)                        [Copiar Enlace] [Ver / Editar] │
│ Description (muted)                                                      │
│ ┌ Results panel (white/very light, lavender border, radius ~16px) ─────┐ │
│ │ código: PROD91 (mono, muted)                          ● Activa       │ │
│ │                  Resumen de respuestas (bold, centered)              │ │
│ │                        ‹  ▬ ●  ›                                     │ │
│ │ 1. ¿Cómo calificarías nuestro nuevo producto?       348 respuestas   │ │
│ │ [category chart]                                                     │ │
│ │ ──────────────────────────────────────────────────────────────────── │ │
│ │ Respuestas totales                                          348 (bold)│ │
│ └──────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Buttons**: "Copiar Enlace" is outline (purple text, lavender border); "Ver / Editar" is solid purple with a shadow. On narrow cards (`dashboard-preview.png`) they stack vertically; on wide cards (`card-*.png`) they sit side by side.
- **Status**: green dot with a soft glow + "Activa"; an inactive survey shows a gray dot + "Inactiva".
- **Carousel**: one dot per question; the active dot is a wider purple pill, the others are small gray circles; `‹` / `›` chevrons on the sides (the left one dimmed on the first question).
- **Question header**: numbered title in semibold on the left, "N respuestas" (that question's `totalAnswers`) muted on the right.
- **Footer**: divider, "Respuestas totales" muted on the left and the survey's `totalResponses` large and bold on the right.

### Satisfaction chart (`card-satisfaction.png`)

1. Row of 5 faces, centered, ~100px circles: background tinted with the reaction color (~10% opacity), 2px border in the reaction color (~40%), soft glow (colored shadow), and the face (eyes + mouth) drawn in the reaction color. Labels below in muted text.
2. Five rows: colored dot (10px) + label (fixed width ~140px) + bar (rounded track in light gray, fill in the reaction color, width = `share`) + count right-aligned.

Faces are an SVG component (`ReactionFace`) with one shape per value (`VERY_BAD` angry with brows, `BAD` sad, `GOOD` straight mouth, `VERY_GOOD` smile, `INCREDIBLE` big smile). They are the same faces the kiosk will use, so they live in a shared folder.

### Rating chart (`card-rating.png`)

Five rows from 1 to 5 stars: N filled amber stars (left column ~150px), bar with amber fill on a light gray track, count right-aligned. The average required by the overview is not in the screenshot; put it in the question header next to the total (`★ 4.1 · 348 respuestas`) so the card height does not change.

### Poll chart (`card-poll.png`)

One block per option: light lavender background, radius ~12px, label on the left, "N respuestas" in bold purple on the right, and a purple bar below (lavender track). Blocks are stacked with ~16px gap.

## 4. Components

Folder layout, following `context/coding-standars.md` (components in `src/components/[feature]/`, PascalCase files):

```
src/
├── app/
│   ├── page.tsx                      redirect("/dashboard")
│   └── (app)/
│       ├── layout.tsx                SidebarProvider + AppSidebar + content
│       └── dashboard/
│           ├── page.tsx              stats, collections section, CTA
│           └── loading.tsx           skeletons
├── components/
│   ├── ui/                           generated by shadcn (button, card, …)
│   ├── layout/
│   │   ├── AppSidebar.tsx
│   │   ├── NavMain.tsx               'use client' (active item from usePathname)
│   │   ├── NavUser.tsx
│   │   ├── TopBar.tsx
│   │   ├── Greeting.tsx              'use client' (local date and time of day)
│   │   └── OrganizationSwitcher.tsx  'use client'
│   ├── dashboard/
│   │   ├── StatCards.tsx
│   │   ├── StatCard.tsx
│   │   ├── CollectionsToolbar.tsx    'use client' (search + date range in the URL)
│   │   ├── SurveyGrid.tsx
│   │   ├── SurveyCard.tsx
│   │   ├── SurveyResults.tsx         'use client' (question carousel)
│   │   ├── CopyLinkButton.tsx        'use client' (clipboard + toast)
│   │   ├── SatisfactionChart.tsx
│   │   ├── RatingChart.tsx
│   │   ├── PollChart.tsx
│   │   ├── MetricBar.tsx
│   │   ├── CreateSurveyCallout.tsx
│   │   └── EmptyState.tsx
│   └── surveys/
│       ├── ReactionFace.tsx          shared with the kiosk
│       └── StarRow.tsx               shared with the kiosk
└── lib/
    ├── mock-data.ts
    ├── format.ts                     number, percent and date formatting
    └── utils.ts                      cn() from shadcn
```

| Component | Server / Client | shadcn/ui | Props (from the mock) |
| --------- | --------------- | --------- | --------------------- |
| `AppSidebar` | Server | `Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarFooter`, `SidebarTrigger`, `Separator` | `user: User` |
| `NavMain` | Client | `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton` (`isActive`, `tooltip`) | static items `{ title, href, icon }` |
| `NavUser` | Server | `Avatar`, `AvatarFallback` | `user: User` |
| `TopBar` | Server | `Button`, `SidebarTrigger` (mobile) | `user`, `organizations`, `currentOrganization` |
| `Greeting` | Client | none | `name: string` |
| `OrganizationSwitcher` | Client | `DropdownMenu`, `Button` | `organizations: Organization[]`, `currentId: string` |
| `StatCards` / `StatCard` | Server | `Card` | `summary: DashboardSummary`; `StatCard` gets `label`, `value`, `hint`, `icon`, `highlighted` |
| `CollectionsToolbar` | Client | `Input`, `Select` | `query`, `range` (read from the URL) |
| `SurveyGrid` | Server | none | `surveys: Survey[]`, `metrics: SurveyMetrics[]` |
| `SurveyCard` | Server | `Card`, `Button` (`asChild` with `Link` for "Ver / Editar"), `Badge` | `survey: Survey`, `metrics: SurveyMetrics` |
| `SurveyResults` | Client | `Button` (icon), `Separator` | `category`, `code`, `isActive`, `metrics: SurveyMetrics` |
| `CopyLinkButton` | Client | `Button`, `sonner` `toast` | `url: string` |
| `SatisfactionChart` | Server-safe (rendered inside the client carousel) | none | `question: QuestionMetrics` |
| `RatingChart` | Server-safe | none | `question: QuestionMetrics` |
| `PollChart` | Server-safe | none | `question: QuestionMetrics` |
| `MetricBar` | Server-safe | `Progress` (track + indicator colored with a CSS variable) | `value: number` (0 to 1), `color`, `label` |
| `CreateSurveyCallout` | Server | `Card`, `Button` | none |
| `EmptyState` | Server | `Card` | none |
| `ReactionFace` | Server-safe | none (SVG) | `value: ReactionValue`, `color`, `size` |
| `StarRow` | Server-safe | none (lucide `Star`) | `filled: number`, `total = 5` |

Notes:

- Only `NavMain`, `Greeting`, `OrganizationSwitcher`, `CollectionsToolbar`, `SurveyResults` and `CopyLinkButton` need `'use client'`. The charts have no state; they are imported by `SurveyResults`, so they run on the client there, but they must stay free of hooks so they can be reused in server pages (per-survey metrics).
- `SurveyResults` receives the whole `SurveyMetrics` (plain data, serializable) and keeps the current question index in `useState`.
- Use the shadcn `Chart` component (Recharts) only later for time series. These cards are plain bars, and `Progress` or a `div` with a width is lighter and easier to style.
- `Badge` is optional: the screenshot uses a dot + text, which can be a small `StatusIndicator` span.

## 5. Design tokens

Colors sampled from the screenshots (approximate) and mapped to shadcn/ui tokens. Values go in `src/app/globals.css`; shadcn init will add its scaffold (`@import "shadcn/tailwind.css"`, `@custom-variant dark`, `@theme inline` mappings, `:root` / `.dark` tokens), and we replace the neutral values with these.

| Token | Light | Used for |
| ----- | ----- | -------- |
| `--background` | `#f8f8fc` | Page background |
| `--foreground` | `#2f3241` | Titles and body text |
| `--card` | `#ffffff` | Cards, sidebar, inputs |
| `--muted` | `#f1f1f5` | Bar tracks, user card |
| `--muted-foreground` | `#6b7080` | Subtitles, labels, counts |
| `--border` | `#e7e7ef` | Neutral borders (sidebar, stat cards, inputs) |
| `--primary` | `#6439c4` | "Ver / Editar", carousel active dot, poll bars and counts |
| `--primary-foreground` | `#ffffff` | Text on primary |
| `--accent` | `#efedfd` | Active nav pill, poll option blocks, icon tiles |
| `--accent-foreground` | `#5b46d6` | Active nav text |
| `--ring` | `#8b7cf0` | Focus rings |
| `--sidebar`, `--sidebar-accent`, `--sidebar-primary`, … | same as card / accent / primary | shadcn `Sidebar` |
| `--highlight` (custom) | `#5d62d6` | "Total responses" card and "New collection" button |
| `--card-border` (custom) | `#ddd4f6` | Lavender border of the survey card and results panel |
| `--success` (custom) | `#5fa04e` | Active dot (3.2:1 on white, fine for a dot, not for text) |
| `--success-foreground` (custom) | `#3d7a32` | Green text such as "One spot remaining" and positive changes (5.2:1 on white, passes AA) |
| `--reaction-very-bad` … `--reaction-incredible` | overview palette | Faces and satisfaction bars |
| `--star` / `--star-empty` | `#f59e0b` / `#d1d5db` | Stars and rating bars |

- Expose custom tokens in `@theme inline` (`--color-highlight: var(--highlight)`, etc.) so they work as `bg-highlight`, `border-card-border`, `text-success`.
- Reaction, star and poll colors also exist as constants in `mock-data.ts` because they are data (each `AnswerOption` stores its `color`). The charts paint with the option's `color` (via a `style` custom property such as `--bar-color`, the only accepted exception to "no inline styles", or a `data-` attribute); the CSS tokens are for static UI such as legends.
- **Radius**: `--radius: 1rem` (stat cards ~16px); survey outer card uses `rounded-3xl`, buttons and inputs `rounded-xl`, pills `rounded-full`.
- **Shadows**: soft and colored: `shadow-[0_10px_30px_-12px_rgb(93_98_214/0.5)]` for the highlighted stat card and primary buttons; cards use a border, not a shadow.
- **Font**: the screenshots look like Inter / SF Pro. Keep Geist (already loaded, very close in proportions) and Geist Mono for `código:`. This avoids an extra font download; switch to Inter only if the design team requires it.
- **Dark mode**: define the same tokens under `.dark` (dark surfaces `#14141c` / `#1c1c27`, borders `white/10%`, same purple slightly lighter `#8b6cf0`). Light stays the default (`defaultTheme="light"`, `enableSystem={false}`), as the coding standards require.

## 6. Data mapping

| Screen value | Source |
| ------------ | ------ |
| Greeting name, sidebar user card | `MOCK_CURRENT_USER.name` / `.email`, initials derived from the name |
| Organization switcher | `MOCK_ORGANIZATIONS`, `MOCK_CURRENT_ORGANIZATION` |
| Total responses (3,062) | `getMockDashboardSummary().totalResponses` |
| Active collections (4 / 5) and hint | `activeSurveys` / `activeSurveyLimit`; hint = `limit - active` spots remaining, or "Limit reached" |
| Response rate, "vs. last month" changes | Not available (see section 7) |
| Survey cards | `getMockActiveSurveys()` and, for each, `getMockSurveyMetrics(survey.id, range)` |
| Card header | `survey.name`, `survey.description`, `survey.code`, `survey.isActive` |
| Question header | `question.text`, `question.totalAnswers`, `question.average` |
| Bars | `option.label`, `option.count`, `option.share`, `option.color`, `option.value` (stars) |
| Respuestas totales | `metrics.totalResponses` |
| Public link | `${PANDA_PUBLIC_URL}/s?code=${survey.code}` |

Keep the data access in one server module so the swap to Prisma is one file:

```ts
// src/lib/dashboard.ts (server-only)
export async function getDashboardData(organizationId: string, range: DateRange) {
  const surveys = getMockActiveSurveys(organizationId);
  return {
    summary: getMockDashboardSummary(organizationId, range),
    cards: surveys.map((survey) => ({ survey, metrics: getMockSurveyMetrics(survey.id, range)! })),
  };
}
```

The real `POST /api/v1/surveys/dashboard` (or a direct Prisma call from the Server Component, as the coding standards prefer) must return the same `DashboardSummary` and `{ survey, metrics: SurveyMetrics }[]` shapes. `SurveyMetrics` already follows section 6 of the overview (`count`, `share`, `totalAnswers`, `average`, `archived`), so only the implementation changes.

### Next.js 16 / Cache Components notes

`next.config.ts` has `cacheComponents: true`, which changes how the page must read runtime data (`01-getting-started/08-caching.md`):

- `searchParams` is a `Promise`. Any component that awaits it (range and search in the URL) must be inside `<Suspense>`, or the dev overlay reports **blocking-route**. Put the static shell (sidebar, top bar, titles) outside and the stats + grid inside a `Suspense` whose fallback is the skeleton.
- `Date.now()` / `new Date()` during render report **blocking-prerender-current-time**. The greeting and date depend on the user's clock and timezone anyway, so render them in the `Greeting` client component (with a stable placeholder on the server). The mock uses the fixed `MOCK_NOW`, so it is safe.
- shadcn's `SidebarProvider` persists the open/closed state in the `sidebar_state` cookie. Reading `cookies()` in the layout is runtime data too: wrap it in `Suspense` or start with `defaultOpen` and skip reading the cookie in the first phase.

## 7. Discrepancies and recommendations

| Topic | Options | Recommendation |
| ----- | ------- | -------------- |
| "Collections" vs. "surveys" | Rename the product to collections, or keep surveys | Keep **surveys** everywhere (routes `/surveys`, code, data model, overview). The UI copy can say "Surveys" ("New survey", "Your surveys", "Active surveys"); if the team prefers "collections" as product language, change only the copy in the message files once next-intl exists, never the code |
| Mixed English / Spanish | Pick one now, or wait for next-intl | Write all copy in **Spanish** now (the cards, the target users and the existing data are Spanish) and keep the strings grouped in constants per component, so moving them to `messages/es.json` with next-intl is mechanical |
| Reaction colors (screenshot blue for "Muy bueno") | Follow the screenshot or the overview | Follow the **overview palette** (single source of truth, also used by the kiosk and stored in each option's `color`). If the blue is preferred, change it in the overview and in `REACTION_OPTIONS` together |
| Poll colors (all purple in the screenshot) | Single primary color, or the per-option fallback colors | Use **`--primary` for all poll bars** like the screenshot; the per-option colors stay in the data for charts that compare options (time series, export) |
| "Response rate" (68.4%) | Define it, or drop the card | No definition exists (responses per kiosk session? per QR scan?). Replace the card for now with **"Average rating"** or **"Responses today"**, both derivable from the mock, and add "response rate" to the overview's open decisions |
| "vs. last month" changes (+14.2%, +4.8%) | Generate a previous period in the mock, or hide them | Hide the change line in the first phase. Later add a previous-period count (`getMockDashboardSummary` with the previous range) once the mock generates older responses for active surveys |
| `/dashboard` vs. "Overview" | — | Route `/dashboard`, nav label "Resumen" / "Overview". `/` redirects to `/dashboard` until there is auth (then it redirects to `/login` when signed out) |
| Date in the screenshot (2024) | — | Format the real date with `Intl.DateTimeFormat` in the user's locale and timezone on the client; the greeting depends on the local hour (morning < 12, afternoon < 19, evening) |
| Mock vs. screenshot for HELP44 | — | The screenshot's three options add up to 78 while the header says 84; the mock adds "El diseño" (6) so the totals match |
| Sidebar items Collections / History / Settings | — | Link to `/surveys`, `/history`, `/settings`; they 404 until their features exist, so show them disabled or point them to placeholder pages in phase 1 |

## 8. States and behavior

- **Loading**: `dashboard/loading.tsx` and the `Suspense` fallback render `Skeleton` blocks with the real layout (3 stat cards, 2 survey cards with a chart-shaped skeleton) so nothing jumps.
- **Empty**: no active surveys → stat cards show `0` and `0 / 5`, the grid is replaced by `EmptyState` ("Todavía no tienes encuestas activas") and the CTA stays.
- **Search with no matches**: "No hay encuestas que coincidan con «…»" and a button to clear the search.
- **Inactive survey**: gray dot + "Inactiva". The dashboard only lists active surveys, but the card must support it because per-survey metrics and history reuse it.
- **Zero answers**: bars at 0 width, counts `0`, `share` 0 (the helper already returns 0 when `totalAnswers` is 0), average hidden.
- **One question**: hide the carousel controls.
- **Archived options with answers**: show them at the end with "(eliminada)" and muted styling, using the stored label (the helper returns `archived: true`).
- **Copiar Enlace**: `navigator.clipboard.writeText(url)` → `toast.success("Enlace copiado")`; on failure `toast.error`. Requires `<Toaster />` (sonner) in the root layout.
- **Ver / Editar**: `Link` to `/surveys/[id]`.
- **New survey / Create collection**: `Link` to `/surveys/new`.
- **Search**: filters by `name` or `code`, case and accent insensitive, on the client over the already loaded cards; the query is kept in `?q=` with `router.replace` (debounced) so it survives reloads.
- **Date range**: `?range=7d|30d|90d|month`, default `30d`; the server converts it to a `DateRange` in the user's timezone (`?tz=`, default `America/Mexico_City`) as the overview describes. With the mock, `MOCK_NOW` is the reference date.
- **Number formatting**: `Intl.NumberFormat` (`3,062` in `en`, `3062` / `3 062` in `es`), percentages with one decimal.

## 9. Responsive and accessibility

- **Sidebar**: `collapsible="icon"` on desktop (the collapse button in the header calls `toggleSidebar`; groups hide their labels with `group-data-[collapsible=icon]:hidden`; menu buttons get a `tooltip`). Below 768px shadcn renders it as a `Sheet` drawer, opened from a `SidebarTrigger` in the top bar.
- **Top bar**: on mobile the date hides, the greeting shrinks, the switcher shows only the dot + chevron, and "New survey" becomes an icon button with `aria-label`.
- **Stat cards**: `grid-cols-1 sm:grid-cols-3`.
- **Survey grid**: `grid-cols-1 lg:grid-cols-2`. Card buttons wrap below the title on small widths.
- **Satisfaction faces**: 5 × ~100px does not fit on a phone; scale them (`size-14 sm:size-20`) and allow labels to wrap.
- **Carousel**: real `button`s with `aria-label="Pregunta anterior"` / `"Pregunta siguiente"`, dots as buttons with `aria-label="Pregunta 2 de 2"` and `aria-current="true"` on the active one, Left / Right arrow keys when the results panel has focus, and an `aria-live="polite"` region announcing the question title.
- **Bars**: `Progress` already exposes `role="progressbar"` with `aria-valuenow`; give each one an `aria-label` like "Muy bueno: 602 respuestas (33%)". The visible count stays as text.
- **Faces and stars**: decorative SVGs with `aria-hidden`, plus visible labels (faces) or `sr-only` text ("4 estrellas").
- **Focus**: shadcn's `focus-visible:ring` with `--ring`; contrast checked for the main pairs: purple on lavender (`#6439c4` on `#efedfd`) 6.2:1, muted text on the page background (`#6b7080` on `#f8f8fc`) 4.7:1, green text `#3d7a32` on white 5.2:1. The screenshot's green (`#5fa04e`, 3.2:1) is only for the status dot.
- **Reduced motion**: carousel transitions and bar width animations under `motion-safe:`.

## 10. Phases

Each phase is one feature spec in `context/features/`, small enough to review in one sitting.

1. **Dashboard UI phase 1, shell**: `npx shadcn@latest init` (Tailwind v4, CSS variables, `src/components/ui`, `src/lib/utils.ts`), install `button card input select avatar dropdown-menu separator sidebar sheet tooltip skeleton progress badge sonner`, add `lucide-react` and `next-themes` (light default), theme tokens from section 5, `(app)/layout.tsx` with `AppSidebar` + `TopBar`, `/` redirect to `/dashboard`, `/dashboard` with `h2` placeholders for stats and grid.
2. **Dashboard UI phase 2, summary**: `src/lib/dashboard.ts`, `StatCards`, "Your surveys" header, `CollectionsToolbar` with `?q=` and `?range=`, `Suspense` + skeletons, `CreateSurveyCallout`, footer.
3. **Dashboard UI phase 3, survey cards**: `SurveyCard`, `SurveyResults` carousel, `MetricBar`, `SatisfactionChart` + `ReactionFace`, `RatingChart` + `StarRow` (with average), `PollChart`, `CopyLinkButton` + `Toaster`.
4. **Dashboard UI phase 4, polish**: empty and no-results states, archived options, mobile pass (drawer, faces, buttons), keyboard carousel, `aria` labels, reduced motion, dark mode tokens and toggle.

## 11. Recommendation

Build the dashboard as Server Components that read from a single `src/lib/dashboard.ts` module backed by the mock, with only six small client components (navigation state, greeting, org switcher, toolbar, carousel, copy link). Use shadcn's `Sidebar`, `Card`, `Button`, `Input`, `Select`, `DropdownMenu`, `Avatar`, `Progress`, `Skeleton` and `Sonner` instead of custom primitives, and write the three charts as plain bar lists rather than Recharts.

Before phase 1, decide the four open points, since they change copy and tokens: **surveys vs. collections** (recommended: surveys), **language** (recommended: Spanish now), **reaction colors** (recommended: overview palette) and the **response rate card** (recommended: replace it until it is defined in the overview).
