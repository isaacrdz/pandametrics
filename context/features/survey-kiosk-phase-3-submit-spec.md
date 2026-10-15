# Survey Kiosk Phase 3 — Submit and Restart Spec

## Overview

Phase 3 of 4 of the public kiosk. It covers:

- storing the answers;
- making them count in the dashboard and the survey table;
- the thank-you screen with its countdown (reference `context/screenshots/survey-landing-4.png`);
- restarting for the next respondent, with tap to start when fullscreen was lost.

Full research in `docs/survey-kiosk.md` (sections 3, 4.3, 4.4, 7, 9).

## Decisions (from the research)

- Public Server Action `submitSurveyResponse` (no auth). The `/api/v1/.../answers` route can wrap the same service later.
- **Every question must be answered**: the server rejects incomplete submissions.
- **Thanks countdown of 5 seconds**, then the runner restarts.
- `source` is `KIOSK` (the code was entered on the code screen) or `LINK` (the page was opened with `?code=`). There is no `QR` source.
- Responses move from the static mock array to an in-memory store that the metrics read, with the future Prisma API.

## Requirements

### Response store (`src/lib/surveys/responses.ts`, server only)

- A `globalThis` `Map`/array seeded with a `structuredClone` of `MOCK_RESPONSES`.
- `listResponses(surveyId?)` and `addResponse(response: SurveyResponse)`.
- `src/lib/mock-data.ts`: `getMockSurveyMetrics`, `countMockResponses` and `getAnsweredOptionIds` read from the store instead of `MOCK_RESPONSES`. Keep the function names, which the dashboard and survey table already use.
- A kiosk response therefore:
  - raises the counts on `/dashboard` and `/surveys`;
  - updates the option metrics;
  - locks the survey category in the form.

### Submit service (`src/lib/surveys/public.ts`)

- `submitPublicResponse(input, meta)`:
  - **Survey**: found by code (`NOT_FOUND`), active and not deleted (`CLOSED`).
  - **Items**:
    - exactly one item per non-archived question, with no duplicates and no unknown questions (`INVALID`);
    - each `answerOptionId` is a non-archived option of its question (`INVALID`).
  - **Snapshot**: build `ResponseItem`s with `answerType`, `answerValue` and `answerLabel` from the stored option.
  - **Stored fields**: `id`, `surveyId`, `organizationId`, `items`, `source`, `deviceId`, `locale`, `durationMs` (clamped to 0–24 h) and `createdAt = new Date()`.
- **Rate limit** (in memory, `globalThis`): per `deviceId` and per IP, at most 1 submission per 3 s and 30 per 10 min. It returns `RATE_LIMITED`. A missing `deviceId` falls back to the IP only.

### Action (`src/actions/kiosk.ts`)

- `"use server"` `submitSurveyResponse(raw)`:
  - validates with Zod: `code` (6 chars), `items` (`{ questionId, answerOptionId }[]`, 1–50), `source` (`KIOSK` | `LINK`), `deviceId` (uuid or null), `locale` (`en` | `es`), `durationMs` (int ≥ 0);
  - reads the IP from `headers()` (`x-forwarded-for` first value, then `x-real-ip`);
  - calls the service;
  - on success, `revalidatePath("/dashboard")` and `revalidatePath("/surveys")`.
- Returns `{ ok: true }` or `{ ok: false, error: "NOT_FOUND" | "CLOSED" | "INVALID" | "RATE_LIMITED" }`, with no thrown errors reaching the client.

### Runner changes (`SurveyRunner`)

- **Metadata**:
  - `deviceId` from `localStorage["panda-metrics:device-id"]`, created with `crypto.randomUUID()`; reads and writes in try/catch, `null` when blocked;
  - `locale` from next-intl;
  - `durationMs` from the first question being shown to the moment of sending.
- **`source`**: `KIOSK` when the runner was reached from the code entry's Continue (pass a flag, for example `sessionStorage["panda-metrics:kiosk-entry"]` set on Continue and read once), otherwise `LINK`.
- **Sending**:
  - Send goes through one guarded `submit()`: a `useRef` flag plus `useTransition`;
  - while pending, Enter / clicks / keys are ignored, and Send shows a spinner and is disabled.
  - **Errors**: a toast with the localized message; the respondent stays on the last question with the answers kept, so they can retry. `CLOSED` / `NOT_FOUND` replace the runner with the matching `KioskMessage`.
  - **Success**: go to the thanks state.

### Thanks (`ThanksScreen`)

- Centered: h1 "The survey was sent successfully" (`text-4xl font-semibold`) and the muted line "The survey will restart in {seconds}s", counting 5 → 1.
- `role="status"` on the title only (the countdown is not announced every second).
- The top-right actions stay (fullscreen, exit).
- At 0:
  - clear answers, `index = 0`, new `startedAt`;
  - if fullscreen was on when Send was pressed and is now off (and fullscreen is supported), go to tap to start; otherwise go straight to the first question.

### Tap to start (`TapToStart`)

- A full-screen button: "Tap to start", large and centered, primary text, subtle pulse (none with reduced motion).
- On tap, `requestFullscreen()` (try/catch), then the first question.

### Messages

- `kiosk.thanks` / `kiosk.errors` in en / es:
  - "La encuesta se envió correctamente", "La encuesta se reiniciará en {seconds} s", "Toca para empezar";
  - "No se pudo enviar. Inténtalo de nuevo.", "Demasiados envíos seguidos. Espera un momento.";
  - "Faltan preguntas por responder".

## Verification

- `yarn lint`, `tsc --noEmit`, `yarn build`.
- **Counts**: answer a survey → thanks → 5 s countdown → first question with empty answers. The survey's count on `/dashboard` and `/surveys` goes up by 1, and the chosen options' counts go up.
- **Category lock**: a survey with no responses becomes category-locked in its form after the first kiosk answer.
- **Double submit**: Enter + click at the same time stores one response. Two sends within 3 s from the same device → second gets the rate-limit toast.
- **Invalid payloads**, sent by calling the action with bad data: a missing question, an option from another question, an archived option or an unknown code are rejected with no change to the store.
- **Inactive survey**: drafted from the admin while the kiosk is open → Send shows the closed screen.
- **`source`**: `KIOSK` after entering the code on `/s`, `LINK` when opening `/s?code=` directly. `deviceId` persists across reloads; `durationMs` is reasonable.
- **Fullscreen**: on → send → if the browser drops it, "Tap to start" appears and restores it. Off → restarts straight to the first question.
- **Visual**: screenshots of the thanks screen at 375 / 1280, light and dark, English and Spanish.

## References

- @docs/survey-kiosk.md
- @context/screenshots/survey-landing-4.png
- @src/types/survey.ts
- @src/lib/mock-data.ts
- @src/lib/surveys/service.ts
- @src/actions/surveys.ts
- @context/project-overview.md
