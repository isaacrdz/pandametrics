# Survey Card Redesign

Redesign of the dashboard survey card with "Propuesta 3: Lista con caritas" (`context/screenshots/card-list-proposal.png`, mockup at https://claude.ai/artifact/AFrPYJ7cBbJzLkGd4Wwy2i).

One change from the mockup: the card has **no** copy link and edit icon buttons. A single "…" button opens the survey actions menu.

## 1. Current state

| Piece | File | What it does today |
| --- | --- | --- |
| Card | `src/components/dashboard/SurveyCard.tsx` | Name (`h3`), description, copy link icon button (`CopyButton`), edit icon button (link to `/surveys/[id]`, solid primary with shadow) |
| Results panel | `src/components/dashboard/SurveyResults.tsx` | **Nested bordered panel**: `código: XXX` + copy code button, status dot + "Activa" / "Inactiva", "Resumen de respuestas" title, dot carousel with arrows (`QuestionPager`), numbered question + average + "N respuestas", category chart, `Separator`, "Respuestas totales" + total |
| Satisfaction chart | `SatisfactionChart.tsx` | Row of big faces (`ReactionFace`, 48–64px) with labels, then dot + label + `MetricBar` + count |
| Rating chart | `RatingChart.tsx` | `StarRow` + amber `MetricBar` + count |
| Poll chart | `PollChart.tsx` | Tinted block per option, "N respuestas" in primary, primary `MetricBar` |
| Helpers | `charts.ts` | `sortOptions` (archived last, stored order otherwise), `useChartLabels` (`archived` label, `barLabel` for the bars' `aria-label`) |
| Bar | `MetricBar.tsx` | shadcn `Progress` with the option color |
| Grid | `SurveyGrid.tsx` | `lg:grid-cols-2`, no-results state |
| Skeleton | `DashboardSkeleton.tsx` | `SurveyCardSkeleton` mirrors the nested panel |
| Row menu | `src/components/surveys/table/SurveyRowMenu.tsx` | "…" menu of the table: Edit, Copy link, Copy code, Activate / Move to draft (+ "N of 5 active" hint), Delete… (opens `DeleteSurveyDialog` through `onDelete`) |
| Delete dialog | `src/components/surveys/form/DeleteSurveyDialog.tsx` | `onDeleted` callback, otherwise `router.push("/dashboard")` |
| Actions | `src/actions/surveys.ts` | `setSurveyActive`, `deleteSurvey`, … all call `revalidateSurveys()` (`/dashboard` and `/surveys`) |

Data facts that matter for the design:

- The dashboard only lists **active** surveys (`listActiveSurveys` in `src/lib/dashboard.ts`), so on a card the status is always "Activa" and "Move to draft" makes the card leave the grid.
- `SurveyCardData` = `{ survey, metrics, publicUrl }`. `QuestionMetrics` has `text`, `totalAnswers`, `average` (rating only, else `null`) and `options` (`label`, `value`, `color`, `count`, `share` 0–1, `archived`).
- Reaction order is `REACTION_VALUES` in `src/lib/surveys/constants.ts` (`VERY_BAD` → `INCREDIBLE`). Rating `value` is `"1"`–`"5"`.
- `CopyButton` (the icon button) is also used by `SharePanel`, so it stays. `useCopyToClipboard` is already used by `SurveyRowMenu`.

## 2. New design

```
┌──────────────────────────────────────────────┐
│ In-store experience                    [ … ] │
│ STORE7 · ● Activa                            │
│                                              │
│ ¿Cómo fue tu experiencia en la tienda?       │
│ (☺) Excelente                   762      41% │
│ ─────────────────────────────────────────────│
│ (☺) Muy bueno                   602      33% │
│ ─────────────────────────────────────────────│
│ (😐) Bueno                       296      16% │
│ ─────────────────────────────────────────────│
│ (☹) Malo                         118       6% │
│ ─────────────────────────────────────────────│
│ (😠) Muy malo                     64       4% │
│                                              │
│ [‹]   Pregunta 1 de 2 · 1,842 respuestas  [›]│
└──────────────────────────────────────────────┘
```

Removed: the nested panel, the description, "Resumen de respuestas", the question number, the dot carousel, the big faces, every bar, the separator + "Respuestas totales" block, the copy code icon, the copy link and edit buttons.

### 2.1 Card

- `article` with `rounded-3xl border border-card-border bg-card p-5 sm:p-6 flex flex-col gap-5 h-full`, labelled by the title.
- **Header** (`flex items-start justify-between gap-4`):
  - Left (`min-w-0`): title `h3` (`text-lg font-bold sm:text-xl`, `truncate` or `line-clamp-2`), below it a meta line `text-sm text-muted-foreground`: code in `font-mono tracking-wide`, `·` (`aria-hidden`), status dot (`bg-success`, the current glow) + "Activa" / "Inactiva".
  - Right: the "…" trigger (see §3).
- **Description**: dropped, as in the mockup. It is still shown in the edit page and the table. If the team wants it back, `line-clamp-1` under the meta line.

### 2.2 Question and options list

- Question as `h4` (`font-semibold text-foreground`), no number (the pager says which one it is). For rating questions, the average goes on the right of this line: star icon + "4.1" (same markup as today), so the pager text stays short.
- `ul` of rows, `divide-y divide-border` (or `--card-border` at reduced opacity, check dark mode). Each `li` is a grid: `grid grid-cols-[1.75rem_minmax(0,1fr)_auto_3rem] items-center gap-3 py-2.5 text-sm`.
  - Icon column, per category:
    - **Satisfaction**: `ReactionFace` at a small size. Pass `className="size-7 border sm:size-7 shadow-none"`; `cn` (tailwind-merge) overrides `size-12 sm:size-16`, `border-2` and the shadow. Optional: add a `size?: "sm" | "md"` prop to `ReactionFace` instead of long overrides (recommended, since the form also uses it).
    - **Rating**: `StarRow filled={n}` with `size-3.5` stars would not fit a 1.75rem column. Use a single star + the number ("5 ★") in the icon column, or widen the column to `5.5rem` and keep `StarRow` with `className="[&_svg]:size-3.5"`. Recommended: keep `StarRow` (it already has the sr-only "5 estrellas" text) and use `grid-cols-[5.5rem_minmax(0,1fr)_auto_3rem]` with an empty label column, since rating options have no label of their own.
    - **Poll**: no icon. Use `grid-cols-[minmax(0,1fr)_auto_3rem]`; the label is the option text (it can be long: `line-clamp-2`, never clipped).
  - Label (`truncate` for faces, `text-foreground`). Archived options: `charts.archived` label and `opacity-60`, as today.
  - Count: `font-semibold tabular-nums text-right`, `format.number(option.count)`.
  - Percentage: `text-xs text-muted-foreground tabular-nums text-right`, `format.number(option.share, { style: "percent", maximumFractionDigits: 0 })`. Rounded values may add up to 99 or 101%; that is acceptable and common, so do not force them.
- **Order**: best first, archived last.
  - Satisfaction: by `REACTION_VALUES.indexOf(value)` descending (do not just reverse the stored order: the form lets the owner pick a subset).
  - Rating: by `Number(value)` descending.
  - Poll: stored order (the owner's order; sorting by count would make rows jump between ranges).
  - Implement as `sortOptionsForList(category, options)` in `charts.ts` next to `sortOptions`.
- Zero answers: rows still show `0` and `0%` so the options are visible. No questions: the existing `results.noQuestions` text.

One shared component replaces the three charts on the card: `OptionList` (`src/components/dashboard/OptionList.tsx`) with a `category` prop choosing the icon column. The three chart files and `MetricBar` become unused on the dashboard: check with `grep` and delete them if nothing else imports them (today only `SurveyResults` does).

### 2.3 Pager

- Bottom row with `mt-auto` so every card in a grid row puts its pager on the same line (cards stretch to the tallest one: poll cards have 2–5 rows).
- `flex items-center justify-between gap-3`: outline `Button size="icon-sm"` with `ChevronLeftIcon`, centered text `text-sm text-muted-foreground`, outline button with `ChevronRightIcon`. Buttons keep the current `aria-label`s (`results.previous` / `results.next`) and are `disabled` at the ends.
- Text: `results.questionOf` ("Pregunta 1 de 2") + `·` + `common.responses` with **`metrics.totalResponses`** (the survey total, which replaces the removed "Respuestas totales" block). Percentages still come from each question's `share`.
- One question: hide both buttons and "Pregunta 1 de 1", keep only "1,842 respuestas" centered, so the total is never lost.
- Keyboard: keep the ArrowLeft / ArrowRight handler on the card section. Drop `aria-roledescription="carrusel"` (there is no carousel any more); keep `aria-live="polite"` on the question heading so a page change is announced.

## 3. The "…" menu

### 3.1 Shared component

Do not copy `SurveyRowMenu`. Extract its body to `src/components/surveys/SurveyActionsMenu.tsx`:

```ts
interface SurveyActionsTarget {
  id: string;
  name: string;
  code: string;
  publicUrl: string;
  isActive: boolean;
}

interface SurveyActionsMenuProps {
  survey: SurveyActionsTarget;
  activeCount: number;
  onDelete: (survey: SurveyActionsTarget) => void;
  triggerClassName?: string;
}
```

- `SurveyRow` already has these fields, so `SurveyRowMenu` becomes a thin wrapper (or is replaced by `SurveyActionsMenu` directly in the table and the stacked list).
- On the card: `survey={{ ...survey, publicUrl }}`, `activeCount={activeSurveyCount}` (already in `DashboardData`; pass it `DashboardSection` → `SurveyGrid` → `SurveyCard`).

### 3.2 Items on the card

Same items and order as the table, so the two menus never drift:

1. Edit (`PencilIcon`, link to `/surveys/[id]`)
2. Copy link (`LinkIcon`, toast `surveyCard.linkCopied` with the URL)
3. Copy code (`CopyIcon`, toast `results.codeCopied`): replaces the removed copy code icon next to the code
4. separator
5. Move to draft (`CircleDashedIcon`). On the dashboard every card is active, so "Activate" and the "N of 5 active" hint never show, but the shared component keeps that branch for the table.
6. separator
7. Delete… (destructive, opens `DeleteSurveyDialog`)

Trigger: `Button variant="outline" size="icon"`, `size-9 rounded-xl border-card-border text-muted-foreground hover:text-foreground`, `MoreHorizontalIcon`, `aria-label={t("actions.label", { name })}` ("Acciones de In-store experience"), visible focus ring as in the table. `DropdownMenuContent align="end"`. No tooltip needed: the label is announced and the icon is the usual "more" icon.

### 3.3 Move to draft and delete from the dashboard

Both make the card disappear after `revalidateSurveys()` refreshes `/dashboard`.

- **Dialog placement**: lift the delete target to `SurveyGrid` (`useState<SurveyActionsTarget | null>`), render one `DeleteSurveyDialog` there with `onDeleted={() => setTarget(null)}`, like `SurveysTableSection`. A dialog inside the card would unmount with the card during the refresh.
- **Focus**: the trigger that Radix would restore focus to no longer exists. After success, move focus to the surveys section heading in `DashboardSection` (`tabIndex={-1}` + `ref`), or to the next card's menu trigger. Recommended: the heading, simple and predictable.
- **Toasts**: reuse `surveys.toasts.deactivated` and the dialog's delete toast.
- **Empty grid**: moving the last card to draft shows the existing "no active surveys" empty state in `DashboardSection`. Stat cards update through the same refresh.
- Confirmation for "Move to draft": not needed (reversible from the table), same as the table.

## 4. Files

| Action | File |
| --- | --- |
| New | `src/components/surveys/SurveyActionsMenu.tsx` (extracted from `SurveyRowMenu`) |
| New | `src/components/dashboard/OptionList.tsx` |
| Change | `SurveyCard.tsx` (header, menu, no nested panel), `SurveyResults.tsx` (question, list, pager; rename to `SurveyQuestionResults` if preferred), `charts.ts` (`sortOptionsForList`), `SurveyGrid.tsx` (delete dialog, `activeCount`, focus target), `DashboardSection.tsx` (pass `activeSurveyCount`), `DashboardSkeleton.tsx`, `ReactionFace.tsx` (optional `size`), `SurveyRowMenu.tsx` / table callers |
| Delete if unused | `SatisfactionChart.tsx`, `RatingChart.tsx`, `PollChart.tsx`, `MetricBar.tsx` (and `progress.tsx` only if nothing else uses it) |
| Keep | `CopyButton.tsx` (used by `SharePanel`), `useCopyToClipboard` |

## 5. i18n

No new strings are strictly needed:

- Reused: `results.questionOf`, `results.previous`, `results.next`, `results.active`, `results.inactive`, `results.codeCopied`, `results.noQuestions`, `common.responses`, `surveyCard.linkCopied`, `surveys.actions.*`, `surveys.toasts.deactivated`, `charts.archived`, `charts.stars`.
- Becomes unused (remove from `en.json` and `es.json` together so the parity check passes): `surveyCard.copyLink`, `surveyCard.edit`, `surveyCard.editLabel`, `results.title`, `results.code`, `results.total`, `results.carousel`, `results.copyCode`; `charts.barLabel` if the bars are deleted. Grep each key before removing it.
- The `·` separators are `aria-hidden` and, because of `react/jsx-no-literals`, come from a constant or a message, as today.

## 6. Accessibility

- The list is a real `ul`; each row reads "Excelente 762 41%" in order. Faces stay `aria-hidden` (the label carries the meaning); stars keep their sr-only text. Color is never the only signal.
- Percent is visible text, so the old `barLabel` is not needed.
- Menu: Radix `DropdownMenu` gives arrow-key navigation, Escape and focus return; the label names the survey.
- Pager buttons are 32px+ with labels and `disabled` at the ends; the question change is announced through `aria-live`.
- Contrast: `text-muted-foreground` on `bg-card` and the row divider are existing pairs. If a new divider token or opacity is used, add the pair to `scripts/check-contrast.mjs` (dividers are decorative, so no 3:1 needed, but document it).

## 7. Responsive and dark mode

- Grid unchanged (`grid-cols-1 lg:grid-cols-2`). At 375px the row grid is `1.75rem + label + count + 3rem`; labels truncate, poll labels wrap. Check no overflow at 375 / 768 / 1280 with the sidebar open and closed.
- `h-full` + `mt-auto` keeps pagers aligned in a grid row; in one column cards keep their natural height.
- Dark mode: face tints (`/12` background, `/45` border) on plum `bg-card`, the row dividers and the outline trigger border. Screenshot both themes.

## 8. Skeleton

`SurveyCardSkeleton`: one card (no inner panel): title bar `h-6 w-1/2` + meta `h-4 w-1/3` with a `size-9 rounded-xl` square on the right; question `h-5 w-2/3`; 5 rows of `size-7 rounded-full` + `h-4 flex-1` + `h-4 w-10`; pager row with two `size-8` squares and a `h-4 w-48` bar.

## 9. Verification

- `yarn lint` (contrast, message parity, `jsx-no-literals`), `tsc --noEmit`, `yarn build` (`/dashboard` keeps its static shell).
- Screenshots of the three categories, light / dark, English / Spanish, at 375 / 768 / 1280, compared with `card-list-proposal.png`.
- Keyboard: Tab to "…" → open with Enter → arrows → Escape returns focus; pager buttons; ArrowLeft / ArrowRight inside the card.
- Menu flows: copy link and code show toasts; Edit opens `/surveys/[id]`; Move to draft removes the card and focuses the heading; Delete opens the dialog, removes the card, stays on `/dashboard`; the table menu still works the same.
- One-question survey shows only the total; rating shows the average next to the question; archived options appear last and dimmed.

## 10. Recommendation

- One feature spec, **Survey Card Redesign**, in this order: extract `SurveyActionsMenu` and switch the table to it (no visual change) → `OptionList` + `sortOptionsForList` → new `SurveyCard` / `SurveyResults` with the menu and the pager → delete dialog and focus in `SurveyGrid` → skeleton, unused files and messages cleanup → `docs/dashboard.md` and `project-overview.md` notes.
- Keep `StarRow` for rating rows (wider icon column), add a `size` prop to `ReactionFace`, show the survey total in the pager, drop the description on the card.
