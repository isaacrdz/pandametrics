# Survey Card Redesign

## Output

`docs/survey-card.md`

## Research

Document how to redesign the dashboard survey card (`SurveyCard` + `SurveyResults`) with "Propuesta 3: Lista con caritas", from `card-list-proposal.png` and the mockup at https://claude.ai/artifact/AFrPYJ7cBbJzLkGd4Wwy2i.

One change from the mockup: the card has **no** "copy link" and "edit" icon buttons. A single "…" button opens a menu with the survey actions (edit, copy link, copy code, and the other actions that already exist for a survey).

The result must be detailed enough to write one feature spec.

## Include

Current state:

- `SurveyCard`: name, description, copy link icon button (`CopyButton`), edit icon button (link to `/surveys/[id]`).
- `SurveyResults`: a nested bordered panel with `código: XXX` + copy code button, status dot, "Resumen de respuestas" title, dot carousel with arrows, numbered question title with average and count, the category chart, a separator and "Respuestas totales".
- Charts: `SatisfactionChart` (row of big faces + bars), `RatingChart` (stars + bars), `PollChart` (tinted blocks + bars), `MetricBar`, `charts.ts` (`sortOptions`, `useChartLabels`).
- The table row menu `SurveyRowMenu` (edit, copy link, copy code, activate / move to draft with the active limit hint, delete with `DeleteSurveyDialog`) and the actions in `src/actions/surveys.ts` (they already revalidate `/dashboard`).
- The dashboard only lists active surveys (`listActiveSurveys`).
- `DashboardSkeleton` mirrors the current nested card.

New design, from the screenshot:

- One card, no inner panel: title; code · status dot + "Activa"; "…" menu on the right.
- Current question as a plain heading (no number, no "Resumen de respuestas").
- A list: face icon + label + count (bold) + percentage (muted), Excelente first, row dividers. No bars, no big faces.
- Pager at the bottom: "‹" button, "Pregunta 1 de 2 · 1,842 respuestas", "›" button.

What to define:

- The list for each category: Satisfaction (faces), Rating (stars) and Poll (no icon); order of options (best first) and archived options.
- Where the rating average goes.
- The pager when there is one question, and which count it shows (question answers vs. survey total).
- The "…" menu: which items appear on the dashboard, and how to share it with `SurveyRowMenu` instead of copying it.
- Delete and "move to draft" from the dashboard: dialog placement, the card leaving the grid, focus after it leaves.
- Card heights in the 2-column grid.
- What is deleted (components, messages) and what is reused.
- i18n keys, accessibility, dark mode, responsive (375 / 768 / 1280), skeleton.

Verification: `yarn lint`, `tsc`, `yarn build`, screenshots light / dark / en / es, keyboard through the menu and pager.

## Sources

- @context/screenshots/card-list-proposal.png
- @src/components/dashboard/SurveyCard.tsx
- @src/components/dashboard/SurveyResults.tsx
- @src/components/dashboard/SatisfactionChart.tsx
- @src/components/dashboard/RatingChart.tsx
- @src/components/dashboard/PollChart.tsx
- @src/components/dashboard/charts.ts
- @src/components/dashboard/SurveyGrid.tsx
- @src/components/dashboard/DashboardSkeleton.tsx
- @src/components/surveys/table/SurveyRowMenu.tsx
- @src/components/surveys/table/SurveysTableSection.tsx
- @src/components/surveys/form/DeleteSurveyDialog.tsx
- @src/components/surveys/ReactionFace.tsx
- @src/components/surveys/StarRow.tsx
- @src/lib/dashboard.ts
- @src/actions/surveys.ts
- @docs/dashboard.md
