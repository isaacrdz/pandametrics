# Survey Kiosk Phase 2 — Question Runner Spec

## Overview

Phase 2 of 4 of the public kiosk: the screen where the respondent answers the survey, one question at a time (references `context/screenshots/survey-landing-2.png` and `survey-landing-3.png`). It replaces the phase 1 placeholder. Sending the answers is phase 3: here "Send" only logs the answers and shows a "Sending arrives in the next phase" toast in development, without storing anything.

Full research in `docs/survey-kiosk.md` (sections 3–6, 9–11).

## Decisions (from the research)

- **Select, then OK**:
  - tapping an option only selects it;
  - "OK →" (or Enter) advances;
  - "Send →" on the last question.
- **Every question must be answered**: OK / Send and ↓ are disabled until the current question has a choice.
- Faces keep `REACTION_COLORS` and stars keep `--star`. The primary is used on OK / Send, the progress fill, enabled ↑ / ↓, the selected poll card and focus rings.
- Poll options render as text cards (no images yet).

## Requirements

### Runner (`src/components/kiosk/SurveyRunner.tsx`, client)

- Props: `survey: PublicSurvey`.
- State:
  - `index` (current question);
  - `answers: Record<questionId, optionId>`;
  - `direction` for the transition.
- One `<main>` with the question view, the top-right actions and the progress card.
- Small muted survey name at the top left.

### Question view (`QuestionView`)

- h1 with the question text: centered, `text-balance`, `font-bold`, `text-[clamp(1.875rem,4vw,3.75rem)]`, max-w-3xl, `tabIndex={-1}`, focused when the question changes.
- Answer area by category (below), then the action row aligned to the right edge of the answers:
  - muted hint "press Enter ↵", hidden with `[@media(hover:none)]:hidden`;
  - **primary** `Button` "OK →" or "Send →" (`h-12 rounded-xl px-8`, `ArrowRightIcon`), disabled without an answer.
- A visually hidden hint: "Use keys 1 to 5 to choose, Enter to continue".

### Options

- Shared wrapper `role="radiogroup"` with `aria-labelledby` pointing to the h1.
- Each option is a `button` with `role="radio"`, `aria-checked` and a roving `tabIndex`; arrow keys move the selection inside the group.

| Category | Component | Option | Selected |
| --- | --- | --- | --- |
| Satisfaction | `FaceOptions` | `ReactionFace` new `size="lg"`: `size-[clamp(3.5rem,14vw,7.8rem)]` (125px max), `border-2` at 45%, `bg` at 12%, label under it (semibold) | full-opacity border, glow `shadow-[0_0_0_6px_color-mix(in_oklch,var(--face-color)_20%,transparent)]`, check badge (`size-6` circle in the face color with a white `CheckIcon`) at the bottom right |
| Rating | `StarOptions` | 5 targets of the same size, each a large `StarIcon` with the label "1"–"5" under it; hover / focus previews the fill up to that star | filled `--star` up to the chosen star, badge on the chosen star |
| Poll | `PollOptions` | cards `rounded-2xl border bg-card`, `w-60 min-h-28` on desktop, label centered `text-lg font-semibold`, position number in a small muted box at the top left | `border-primary ring-2 ring-primary/30 bg-accent`, primary check badge |

- Order: Satisfaction from Very bad to Excellent (left to right), Rating 1–5, Poll in stored order.
- `ReactionFace` gets an optional `selected` prop for the glow and badge (`sm` / `md` unchanged).

### Keyboard

- `1`–`5` select the option in that position.
- `Enter` → OK / Send when enabled.
- `↑` → previous question; `↓` → next question when the current one is answered.
- Listen on `window`, but ignore events from inputs and the open exit dialog.

### Top-right actions

- `FullscreenToggle`:
  - round outline icon button (`Maximize2Icon` / `Minimize2Icon`) with a tooltip "Fullscreen" / "Exit fullscreen";
  - state from `fullscreenchange`;
  - hidden when `document.fullscreenEnabled` is false;
  - `requestFullscreen` / `exitFullscreen` in try/catch.
- `ExitSurveyButton`: outline, primary text, `XIcon`, "Exit survey".
  - With answers: an `AlertDialog` "Exit the survey? Your answers will be lost" (Cancel / Exit).
  - Without answers: exits directly.
  - Exiting leaves fullscreen and goes to `/s`.
- Phase 1's code entry requests fullscreen on Continue (a user gesture) before navigating.

### Progress card (`ProgressCard`)

- Fixed bottom right (`bottom-6 right-6`), `bg-card border rounded-2xl shadow-sm p-4`, width ~22rem.
- Text "**N%** completed", with N = answered / total, rounded.
- A bar `h-1.5 rounded-full bg-muted` with a `bg-primary` fill (width transition) and `role="progressbar"`.
- ↑ / ↓ square outline icon buttons (`ArrowUpIcon` / `ArrowDownIcon`) with labels "Previous question" / "Next question":
  - `border-primary text-primary` when enabled;
  - muted when disabled (first question / unanswered).
- The percent text sits in an `aria-live="polite"` region.

### Transitions

- On next / previous, the current question fades out and slides (−24px up for next, +24px for previous) in 350 ms, then the new one enters the same way, for 700 ms in total and no overlap.
- With `motion-reduce`, a 150 ms opacity-only transition.
- Focus moves to the new h1 after it enters.

### Responsive

| Viewport | Layout |
| --- | --- |
| ≥ 1024 | As the references; poll cards wrap 3 + 2 when 5 do not fit |
| 640–1023 | Targets scale with the clamp |
| < 640 | Question `text-3xl`; faces / stars in one row of 5 sized to fit (≈ 60px at 375), labels `text-xs`; poll cards stacked full width (`h-14`, label left, number right); OK full width; progress card becomes a full-width bottom bar (`inset-x-0 bottom-0 rounded-none border-t`) and the content gets matching bottom padding |
| height ≤ 520 | Smaller question type, no Enter hint, compact progress (bar + arrows), content top-aligned |

### Messages

- `kiosk.runner` in en / es:
  - "presiona Enter", "OK", "Enviar", "Salir de la encuesta", "{percent}% completado";
  - "Pregunta anterior", "Siguiente pregunta", "Pantalla completa", "Salir de pantalla completa";
  - "¿Salir de la encuesta?", "Se perderán tus respuestas", "Cancelar", "Salir";
  - the keyboard hint, "{n} estrellas" (ICU plural).

## Verification

- `yarn lint`, `tsc --noEmit`, `yarn build`.
- Each category with mouse, touch (DevTools touch) and keyboard:
  - select, change the choice, OK, ↑ / ↓, 1–5 and Enter;
  - OK and ↓ disabled without an answer;
  - the last question shows Send.
- Answers kept when going back and forward.
- Exit: the dialog appears only with answers, and Exit returns to `/s` and leaves fullscreen.
- Fullscreen: entered on Continue, the toggle works and follows Esc.
- Progress: percentage and bar match the answered count; the live region announces it.
- Screen reader: the h1 is read on each question; options are announced as radios with their labels ("Very good", "3 stars", the poll label) and checked state.
- Reduced motion: a short fade only.
- Screenshots at 375 / 768 / 1024 / 1280 and 1024×500, light and dark, English and Spanish: no overflow, faces and stars at the planned sizes, the primary only where listed.

## References

- @docs/survey-kiosk.md
- @context/screenshots/survey-landing-2.png
- @context/screenshots/survey-landing-3.png
- @src/components/surveys/ReactionFace.tsx
- @src/components/surveys/StarRow.tsx
- @src/lib/surveys/constants.ts
- @src/components/ui/alert-dialog.tsx
