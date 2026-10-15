# Survey Kiosk Phase 1 — Route and Code Entry Spec

## Overview

Phase 1 of 4 of the public kiosk where respondents answer a survey. It covers:

- the public `/s` route;
- the reduced public survey read by code;
- code parsing;
- the code entry screen (reference `context/screenshots/survey-landing-1.png`);
- the not found / closed screens;
- enabling "Open survey" in the share panel.

The runner (phase 2) is only a placeholder here.

Full research in `docs/survey-kiosk.md` (sections 1–4, 7, 8 code parsing, 11).

## Decisions (from the research)

- Route group `(kiosk)` with its own layout: no sidebar or top bar, `noindex`.
- Static shell; `searchParams` read in a child inside `<Suspense>` (Cache Components). The server resolves the survey by code, with no client fetch to start.
- Entering a code navigates to `/s?code=XXXXXX` (shareable URL; back returns to code entry).
- Emphasized buttons use the primary (`bg-primary`). Scan / Upload are outline buttons with primary text.
- Scan QR and Upload QR image are visible but disabled with a "Coming soon" tooltip until phase 4.

## Requirements

### Route

- `src/app/(kiosk)/layout.tsx`:
  - full-height `bg-background` canvas;
  - `metadata` with `robots: { index: false, follow: false }` and the title "Answer a survey · Panda Metrics" (English, like the rest of the server metadata).
- `src/app/(kiosk)/s/page.tsx`:
  - the static frame, plus `<Suspense fallback={<KioskLoading />}>` around `KioskEntry`, which awaits `searchParams`;
  - `code` missing or blank → `CodeEntry`;
  - otherwise `parseSurveyCode(code)`: `null` → `CodeEntry` with the invalid-code error and the raw value prefilled;
  - otherwise `getPublicSurvey(parsed)`:
    - `ok` → `SurveyRunnerPlaceholder` (phase 2 replaces it): survey name, question count and an "Exit survey" link to `/s`;
    - `notFound` / `closed` → `KioskMessage`.
- `KioskLoading`: a centered spinner with `role="status"` and an sr-only "Loading survey".

### Data

- `src/lib/surveys/code.ts` — `parseSurveyCode(text: string): string | null`:
  1. trim and uppercase;
  2. if the text parses as a URL with a `code` search param, use that value;
  3. otherwise take the first match of `/\b[A-Z0-9]{6}\b/`.

  It never throws. Export `SURVEY_CODE_LENGTH = 6`.
- `src/lib/surveys/public.ts` — `getPublicSurvey(code)` returns one of:
  - `{ status: "ok", survey: PublicSurvey }`;
  - `{ status: "notFound" }`: unknown code or deleted survey;
  - `{ status: "closed" }`: inactive survey.

  `PublicSurvey` = `code`, `name`, `category`, `questions[]` with `id`, `text` and `options[]` (`id`, `type`, `value`, `label`, `color`). It leaves out archived questions and options, and has no organization, user or date fields. Lookup is case insensitive across all organizations (the code is global).
- Add `getSurveyByCode(code)` to `src/lib/surveys/service.ts` if no lookup by code exists.

### Code entry screen (`src/components/kiosk/CodeEntry.tsx`, client)

- Small `Logo` at the top left (links to `/`), `LanguageSwitcher` at the top right.
- Centered column (max-w-md, left-aligned text as in the reference):
  - h1 "Enter the survey code";
  - muted subtitle "Type the 6-character code or scan the QR code".
- Code `Input`:
  - `h-12`, with the label "Code";
  - uppercase as you type, limited to 6 characters after removing spaces;
  - `autoComplete="off"`, `autoCapitalize="characters"`, `spellCheck={false}`;
  - `font-mono tracking-[0.3em]` once it has a value;
  - pasting a full link fills in the parsed code.
- **"Continue →"**: primary button `h-11 rounded-xl` with `ArrowRightIcon`, disabled until a 6-character code is present. Enter submits. It navigates with `router.push("/s?code=…")` inside a transition, with a pending spinner.
- Inline error (`role="alert"`, `text-destructive`, under the input) when the URL code could not be parsed: "That code doesn't look right".
- Under Continue, "Scan QR" (`ScanQrCodeIcon`) and "Upload QR image" (`ImageUpIcon`):
  - `variant="outline"` with `text-primary`;
  - disabled with the tooltip "Coming soon" (`aria-disabled`, focusable, so the tooltip shows).

### Not found / closed (`src/components/kiosk/KioskMessage.tsx`)

- Same frame as code entry (logo, language switcher, centered column).
- `notFound`: h1 "We couldn't find that survey", muted line "Check the code {code} and try again".
- `closed`: h1 "This survey is closed", muted "It is no longer accepting answers".
- Primary "Try another code" link button to `/s`.

### Share panel

- `SharePanel`: "Open survey" becomes a link button (`asChild` + `<a href={publicUrl} target="_blank" rel="noopener noreferrer">`). Remove the disabled wrapper, the tooltip and the `openSoon` message (en / es).

### Messages

- A new `kiosk` namespace in `en.json` / `es.json` for every screen in this phase.
- Spanish, following the reference:
  - "Ingresa el código de la encuesta", "Escribe el identificador de 6 caracteres o escanea el código QR", "Código", "Continuar";
  - "Escanear QR", "Subir imagen QR", "Próximamente";
  - "No encontramos esa encuesta", "Esta encuesta está cerrada", "Probar otro código", "Cargando encuesta";
  - "Ese código no parece correcto".

## Verification

- `yarn lint`, `tsc --noEmit`, `yarn build`: `/s` is a partial prerender (static shell, Suspense content).
- `/s` shows code entry. Typing `store7` + Enter → `/s?code=STORE7` → placeholder with the survey name.
- Pasting `https://…/s?code=EVENT2` fills `EVENT2`.
- `/s?code=ZZZZZZ` → not found. A draft survey's code → closed. `/s?code=%%%` → code entry with the error.
- "Open survey" in the survey form opens `/s?code=…` in a new tab.
- Scan / Upload are disabled with the tooltip on hover and focus.
- 375 / 768 / 1280, light and dark, English and Spanish: no overflow, one h1, the primary on Continue and Try another code.
- The HTML has `<meta name="robots" content="noindex, nofollow">`.

## References

- @docs/survey-kiosk.md
- @context/screenshots/survey-landing-1.png
- @src/lib/surveys/service.ts
- @src/lib/dashboard.ts
- @src/components/surveys/form/SharePanel.tsx
- @src/components/brand/Logo.tsx
- @src/components/layout/LanguageSwitcher.tsx
- @src/app/layout.tsx
- `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`
