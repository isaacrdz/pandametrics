# Survey Card Redesign Spec

## Overview

Simplify the dashboard survey card with "Propuesta 3: Lista con caritas" (`context/screenshots/card-list-proposal.png`):

- one card, no nested results panel;
- the current question as a short list (icon + option + count + percentage);
- a simple pager at the bottom;
- a single "…" menu instead of the copy link and edit buttons.

The "…" menu is shared with the surveys table so both menus stay the same. Full research in `docs/survey-card.md`.

## Decisions (from the research)

- **No copy link or edit buttons on the card:** one "…" menu with Edit, Copy link, Copy code, Move to draft and Delete…, the same items and order as the table row menu.
- **One menu component:** `SurveyRowMenu` is extracted to `SurveyActionsMenu` and used by the table, the stacked list and the card.
- **No description on the card**, as in the mockup. It stays in the edit page and the table.
- **The pager shows the survey total** (`metrics.totalResponses`), replacing the "Respuestas totales" block. With one question it shows only the total.
- **Best option first:** satisfaction from Excelente to Muy malo, rating from 5 to 1, poll in the owner's order. Archived options last and dimmed.
- **No bars and no big faces.** The percentage is visible text.
- **The delete dialog lives in `SurveyGrid`**, not in the card, because the card unmounts when the dashboard refreshes.

## Requirements

### Shared actions menu

- New `src/components/surveys/SurveyActionsMenu.tsx`, with the body of today's `SurveyRowMenu`:
  - props: `survey: { id, name, code, publicUrl, isActive }`, `activeCount`, `onDelete(survey)`, optional `triggerClassName`;
  - items and behavior unchanged: Edit (`Link`), Copy link, Copy code (toasts), a separator, Activate / Move to draft with the "{count} of {limit} active" hint for drafts, a separator, Delete… (destructive).
- The table and the stacked list use it (`SurveyRowMenu` becomes a thin wrapper or is removed). **No visual or behavior change in `/surveys`.**

### Card (`SurveyCard`)

- `article` labelled by the title: `flex h-full flex-col gap-5 rounded-3xl border border-card-border bg-card p-5 sm:p-6`.
- **Header** (`flex items-start justify-between gap-4`):
  - left (`min-w-0`): title `h3` (`text-lg font-bold sm:text-xl`, never clipped: `line-clamp-2`); meta line in `text-sm text-muted-foreground` with the code (`font-mono tracking-wide`), a `·` (`aria-hidden`), the status dot (`bg-success` with the current glow) and "Activa" / "Inactiva";
  - right: `SurveyActionsMenu` with an outline trigger `size-9 rounded-xl border-card-border text-muted-foreground hover:text-foreground`, `MoreHorizontalIcon`, label "Actions for {name}", `align="end"`.
- Removed: description, copy link `CopyButton`, edit link button, nested panel, "Resumen de respuestas", copy code icon, `Separator` and "Respuestas totales".
- `activeSurveyCount` goes `DashboardSection` → `SurveyGrid` → `SurveyCard` as `activeCount`.

### Question and options list

- Question as `h4` (`font-semibold text-foreground`), without number, inside an `aria-live="polite"` wrapper. For rating, the average (star icon + `4.1`) on the right of the same line, as today.
- New `src/components/dashboard/OptionList.tsx` (`category`, `question`) replaces `SatisfactionChart`, `RatingChart` and `PollChart` on the card:
  - `ul` with row dividers (`divide-y`), each `li` a grid `items-center gap-3 py-2.5 text-sm`;
  - **Satisfaction**: `grid-cols-[1.75rem_minmax(0,1fr)_auto_3rem]`; small `ReactionFace` (`size-7`, 1px border, no glow) + label (`truncate`);
  - **Rating**: `grid-cols-[5.5rem_minmax(0,1fr)_auto_3rem]`; `StarRow` with smaller stars (keeps its sr-only "N stars") and an empty label cell; archived options show their label instead;
  - **Poll**: `grid-cols-[minmax(0,1fr)_auto_3rem]`; label with `line-clamp-2`;
  - count: `font-semibold tabular-nums text-right`, `format.number(count)`;
  - percentage: `text-xs text-muted-foreground tabular-nums text-right`, `format.number(share, { style: "percent", maximumFractionDigits: 0 })`;
  - archived: `charts.archived` label and `opacity-60`;
  - options with no answers show `0` and `0%`.
- `ReactionFace`: new optional `size?: "sm" | "md"` prop (`md` is today's default, so the form does not change).
- `charts.ts`: new `sortOptionsForList(category, options)`:
  - satisfaction by `REACTION_VALUES.indexOf(value)` descending;
  - rating by `Number(value)` descending;
  - poll in stored order;
  - archived always last.
- No questions: the existing `results.noQuestions` text.

### Pager

- Last row of the card with `mt-auto`, so pagers line up across a grid row.
- `flex items-center justify-between gap-3`: outline `size="icon-sm"` buttons with `ChevronLeftIcon` / `ChevronRightIcon`, labels `results.previous` / `results.next`, `disabled` at the ends.
- Center text `text-sm text-muted-foreground`: `results.questionOf` + `·` + `common.responses` with `metrics.totalResponses` ("Pregunta 1 de 2 · 1,842 respuestas").
- One question: no buttons and no "Pregunta 1 de 1", only "1,842 respuestas" centered.
- ArrowLeft / ArrowRight still change the question inside the card. Remove the dot buttons and `aria-roledescription`.

### Move to draft and delete from the dashboard

- `SurveyGrid` keeps the delete target in state and renders one `DeleteSurveyDialog` with `onDeleted={() => setTarget(null)}` (stays on `/dashboard`).
- After "Move to draft" or delete, the card leaves the grid when the dashboard refreshes. Focus moves to the surveys section heading in `DashboardSection` (`tabIndex={-1}` + ref), since the menu trigger no longer exists.
- Moving the last active survey to draft shows the existing "no active surveys" empty state, and the stat cards update.

### Skeleton

- `SurveyCardSkeleton` without the inner panel: title `h-6 w-1/2` + meta `h-4 w-1/3` with a `size-9 rounded-xl` block on the right; question `h-5 w-2/3`; 5 rows (`size-7 rounded-full` + `h-4 flex-1` + `h-4 w-10`); pager row with two `size-8` blocks and an `h-4 w-48` bar.

### Cleanup and messages

- Delete `SatisfactionChart.tsx`, `RatingChart.tsx`, `PollChart.tsx` and `MetricBar.tsx` if nothing else imports them (and `ui/progress.tsx` only if unused). Keep `CopyButton` (used by `SharePanel`).
- No new strings. Remove from **both** `en.json` and `es.json`, after grepping each one: `surveyCard.copyLink`, `surveyCard.edit`, `surveyCard.editLabel`, `results.title`, `results.code`, `results.total`, `results.carousel`, `results.copyCode`, and `charts.barLabel` if the bars are gone.
- Separators (`·`) come from a constant or a message (`react/jsx-no-literals`).
- Update `docs/dashboard.md` (card section) to match the new card.

## Verification

- `yarn lint` (contrast, message parity, `jsx-no-literals`), `tsc --noEmit`, `yarn build` (`/dashboard` keeps its static shell).
- **Card:** the three categories match the mockup structure; satisfaction shows Excelente first; rating shows 5 stars first and the average; poll labels wrap without clipping; archived options last and dimmed; a one-question survey shows only the total.
- **Grid:** pagers line up in a 2-column row with cards of different lengths.
- **Menu on the card:** Edit opens `/surveys/[id]`; Copy link / Copy code show their toasts; Move to draft removes the card, shows the toast and focuses the section heading; Delete opens the dialog, removes the card and stays on `/dashboard`.
- **Table unchanged:** the row menu in `/surveys` (table and stacked list) still works the same, including Activate with the 5-active limit.
- **Keyboard:** Tab to "…" → Enter → arrows → Escape returns focus; pager buttons; ArrowLeft / ArrowRight in the card; the question change is announced.
- 375, 768, 1280px with the sidebar open and closed; light, dark, English, Spanish; no overflow and no console errors.

## References

- @docs/survey-card.md
- @context/screenshots/card-list-proposal.png
- @src/components/dashboard/SurveyCard.tsx
- @src/components/dashboard/SurveyResults.tsx
- @src/components/dashboard/SurveyGrid.tsx
- @src/components/dashboard/DashboardSection.tsx
- @src/components/dashboard/DashboardSkeleton.tsx
- @src/components/dashboard/charts.ts
- @src/components/surveys/table/SurveyRowMenu.tsx
- @src/components/surveys/form/DeleteSurveyDialog.tsx
- @src/components/surveys/ReactionFace.tsx
- @src/components/surveys/StarRow.tsx
