# Survey Kiosk (answer a survey)

The public view where anyone answers a survey without an account: on a kiosk tablet left running, from a shared link on a phone or by scanning a QR. Based on the four reference screenshots in `context/screenshots/survey-landing-{1..4}.png` and on the kiosk plan in `context/project-overview.md` (sections 1, 2, 7, 8, 9 and 13). Emphasized buttons use the project primary (`--primary`, blue `#4263eb`; `#748ffc` in dark).

## 1. Current state

- **Public link**: `getPublicSurveyUrl(code)` (`src/lib/dashboard.ts`) builds `${PANDA_PUBLIC_URL}/s?code=AB12CD`. The share panel shows it, copies it and turns it into a QR (`qrcode`), but its **"Open survey" button is disabled** ("Available when the kiosk is ready") because `/s` does not exist yet.
- **No public route**: `src/app` only has `(marketing)` (landing) and `(app)` (admin with sidebar). The root layout already provides fonts, theme (`next-themes`, light by default), next-intl (language in `localStorage`), tooltips and toasts.
- **Data model** (`src/types/survey.ts`, mirrors the Prisma schema):
  - `Survey` has `code`, `name`, `description`, `category` (`SATISFACTION` / `RATING` / `POLL`), `isActive`, `questions[]`, `deletedAt`.
  - `Question` has `text`, `options[]` and `archivedAt`. `AnswerOption` has `type` (`REACTION` / `RATING` / `TEXT` / `IMAGE`), `value`, `label`, `color` and `archivedAt`.
  - `SurveyResponse` has `items[]` (`questionId`, `answerOptionId` and a snapshot of type / value / label), `source` (`KIOSK` / `LINK` / `QR`), `deviceId`, `locale`, `durationMs` and `createdAt`.
- **Stores**:
  - Surveys live in an in-memory store on `globalThis` (`src/lib/surveys/service.ts`).
  - Responses are a **static** `MOCK_RESPONSES` array (`src/lib/mock-data.ts`). The dashboard metrics, `countMockResponses` and `hasResponses` all read it, so a new submission has nowhere to go today.
- **Poll options are text only**: the form creates `TEXT` options. `IMAGE` exists in the types, but image upload is not built. The circular image options in screenshot 2 are therefore out of scope until uploads exist.
- **Reusable pieces**:
  - survey visuals: `ReactionFace` (sizes `sm` / `md`), `StarRow`;
  - layout: `Logo`, `LanguageSwitcher`;
  - shadcn: `Button`, `Input`, `Dialog` (to add), `Progress` (removed earlier; a plain div bar is enough);
  - brand and survey colors: tokens in `globals.css`, `REACTION_COLORS` and `RATING_COLOR`.

## 2. Route and layout

- New route group `src/app/(kiosk)/s/page.tsx` → URL `/s`. Its own `layout.tsx` has no sidebar or top bar, just a full-height `bg-background` canvas, and `metadata.robots = { index: false }` (public but not for search engines).
- **Static shell, code inside Suspense** (Cache Components): the page renders the frame statically and reads `searchParams` in a child wrapped in `<Suspense>`:
  - no `code`: code entry screen;
  - `code`: the server looks the survey up and renders the runner with the reduced survey, or the not-found / closed screen. No client fetch is needed to start.
- Entering a code (typed, scanned or uploaded) navigates with `router.push("/s?code=XXXXXX")`, so the URL is shareable and the back button returns to the code entry.
- The share panel's "Open survey" button becomes a real link to `publicUrl` in a new tab (the `openSoon` tooltip and message are removed).

## 3. State machine

As planned in the overview (section 7):

```
codeEntry → (notFound | closed | answering) → submitting → thanks → (tapToStart →) answering
```

| State | Screen | Exit |
| --- | --- | --- |
| `codeEntry` | Screenshot 1 | valid code → navigate to `/s?code=` |
| `notFound` | "We couldn't find that survey" + code shown + "Try another code" (primary) | back to code entry |
| `closed` | "This survey is closed" (inactive or deleted) + "Try another code" | back to code entry |
| `answering` | Screenshots 2 and 3, one question at a time | "Send" on the last question |
| `submitting` | Same question, "Send" shows a spinner and is disabled; Enter / clicks ignored | success → `thanks`, error → toast + stay |
| `thanks` | Screenshot 4, countdown from 5 s | 0 s → reset answers → `answering` (or `tapToStart`) |
| `tapToStart` | Full-screen "Tap to start" (only when fullscreen was on and the browser dropped it) | tap → re-enter fullscreen → first question |

The runner keeps answers in client state only (`Map<questionId, optionId>`), plus `startedAt` for `durationMs`. A reset clears them and goes back to the first question.

## 4. Screens

All screens: centered content on the neutral page (`bg-background`), no card, large type. The Panda Metrics logo sits small at the top left of code entry and of the error screens only (not in the runner, so the question stays the focus).

### 4.1 Code entry (screenshot 1)

- Title **"Enter the survey code"** (h1, ~text-2xl semibold) and subtitle "Type the 6-character code or scan the QR code" (muted).
- Code `Input`: `h-12`, `maxLength` 6 after cleanup, uppercase as you type, `autoComplete="off"`, `autoCapitalize="characters"`, `inputMode="text"`, `font-mono tracking-[0.3em]` once typed, label "Code" (visible or `sr-only` with placeholder).
- **"Continue →"**: primary button (`bg-primary`, white text), `h-11`; disabled until the input holds a valid 6-character code. Enter submits.
- Under it, two **outline buttons with primary text and icons** (as in the reference): "Scan QR" (`ScanQrCodeIcon`) and "Upload QR image" (`ImageUpIcon`).
- Inline error under the input ("That code doesn't look right" for an invalid format; "We couldn't find that survey" comes back from the server as the `notFound` screen).
- Language switcher at the top right (the kiosk operator picks the UI language once; it stays in `localStorage`).

### 4.2 Question (screenshots 2 and 3)

- **Top right**:
  - fullscreen toggle: round icon button, neutral (`variant="outline"`, `Maximize2Icon` / `Minimize2Icon`, tooltip). Hidden when `document.fullscreenEnabled` is false, as on iPhone Safari;
  - **"Exit survey"**: outline button with primary text and `XIcon`. It asks for confirmation when answers exist ("Exit? Your answers will be lost"), exits fullscreen and goes to `/s`.
- **Question text**: h1, centered, `text-4xl` to `text-6xl` (clamp), bold, `text-balance`, max width ~48rem.
- **Answer row** (by category, section 5), centered under the question.
- **Action row** aligned to the right edge of the answer row:
  - muted hint "press Enter ↵" (hidden on touch-only devices with `@media (hover: none)`);
  - **primary button "OK →"**, or **"Send →"** on the last question. Disabled until an option is selected.
- **Progress card** (bottom right, fixed; `bg-card`, border, rounded-2xl, soft shadow):
  - "**N%** completed", where N = answered questions / total;
  - a thin bar with a `bg-muted` track and `bg-primary` fill;
  - two square outline icon buttons ↑ (previous question) and ↓ (next question, enabled only when the current one is answered);
  - the up / down buttons turn primary-outlined when enabled, as in screenshot 3.
- **Survey name**: small and muted at the top left, so a respondent knows which survey this is (not in the reference; optional).

### 4.3 Thanks (screenshot 4)

- "**The survey was sent successfully**" (h1, ~text-4xl), and "The survey will restart in Ns" (muted, live countdown from 5).
- `role="status"` with `aria-live="polite"` on the title (announced once; the countdown is not announced every second).
- A small check icon in a `bg-success/12` circle above the title is optional, since the reference has none.

### 4.4 Tap to start

- A full-screen button "Tap to start" (huge, centered, primary text on the page) shown after a restart only when fullscreen had been on and was lost. Browsers only allow `requestFullscreen()` from a user gesture, so the tap re-enters it.

### 4.5 Not found / closed

- Same layout as code entry: title, a muted line with the code, and a primary "Try another code" button.

## 5. Answer UI per category

Shared rules:

- One selected option per question.
- Clicking or tapping an option selects it, and tapping another one changes the choice.
- Keys `1`–`5` select the option in that position.
- `Enter` confirms (OK / Send).
- `↑` / `↓` move to the previous / next question.
- Options are a `role="radiogroup"` labelled by the question, each option a `role="radio"` with `aria-checked`. Arrow keys inside the group move the selection, the usual radio behavior.
- Archived options and questions are never sent to the kiosk.

| Category | Option | Selected |
| --- | --- | --- |
| Satisfaction (screenshot 3) | `ReactionFace` with a new `size="lg"`: a 125px circle with a tinted background (`--face-color` 12%), a 2px border at 45% and a face at 60%, label under it (semibold) | solid border, glow `shadow-[0_0_0_6px_color-mix(--face-color 20%)]`, check badge (16px circle in the face color, white check) on the bottom right |
| Rating | 5 stars in a row, each a 125px target with a large star (`StarRow` logic: hover / focus fills up to that star, `--star` color), label "1"–"5" under each (or the option label) | stars up to the chosen one filled, chosen star with a check badge |
| Poll (text) | Option cards: rounded-2xl, `bg-card`, border, 240px wide on desktop, label centered (text-lg semibold), position number `1`–`5` in a small muted box at the top left (keyboard hint) | `border-primary`, `ring-2 ring-primary/30`, `bg-accent`, check badge in primary |

Order: Satisfaction from **Very bad to Excellent**, left to right, as in screenshot 3 and the 1–5 key mapping. Rating 1 to 5. Poll in the owner's order.

Colors:
- Faces keep `REACTION_COLORS` and stars keep `--star`, unchanged as requested.
- Primary is used for the action buttons, the progress fill, the selected poll card and the focus rings.
- The reference's blue "Very good" face is a different palette; Panda Metrics keeps its own reaction colors.

Transitions:
- Next / previous question: 700 ms slide and fade with no overlap. The outgoing question leaves, then the incoming one enters.
- With `prefers-reduced-motion`, a 150 ms fade only.
- Focus moves to the new question's heading (`tabIndex={-1}`) so screen readers read it.

## 6. Primary color usage

| Element | Style |
| --- | --- |
| Continue, OK, Send, Try another code | Filled primary (`bg-primary text-primary-foreground`), `h-11`–`h-12`, `rounded-xl`, arrow icon |
| Scan QR, Upload QR image, Exit survey | Outline (`border` neutral, `bg-card`) with **primary text and icon**, like the reference |
| Progress fill, ↑ / ↓ when enabled | Primary fill / primary outline |
| Selected poll card, check badge on poll | Primary border, ring and badge |
| Fullscreen toggle, ↑ / ↓ when disabled | Neutral outline / muted |
| Faces and stars | Their own data colors (not primary) |

White on `#4263eb` is 4.98:1 and primary text on the page is 4.52:1, both already in `check-contrast.mjs`.

## 7. Data and server

### Public survey (read)

`getPublicSurvey(code)` in a new `src/lib/surveys/public.ts`, called by the page inside Suspense.

The reduced shape keeps only what the kiosk needs:

```ts
interface PublicSurvey {
  code: string;
  name: string;
  category: SurveyCategory;
  questions: { id: string; text: string; options: { id: string; type: AnswerType; value: string; label: string; color: string }[] }[];
}
```

- Archived questions and options are excluded, and there are no organization, user or date fields.
- The lookup is by code (case insensitive).
- Results:
  - `{ status: "ok", survey }`;
  - `{ status: "notFound" }` for an unknown code or a deleted survey;
  - `{ status: "closed" }` for an inactive survey (overview: 404 vs 400).

### Submit (write)

A Server Action `submitSurveyResponse` in `src/actions/kiosk.ts`, public with no auth.

The codebase uses Server Actions everywhere; the `/api/v1/surveys/public/[code]/answers` route in the overview can wrap the same service later.

Input, validated with Zod:

```ts
{ code, items: [{ questionId, answerOptionId }], source, deviceId, locale, durationMs }
```

Server rules (overview, API rules 6–8):
- The survey must exist, be active and not deleted.
- Every `questionId` must belong to the survey, and each `answerOptionId` to its question; no archived ones.
- There are no duplicate questions, and **every question must be answered**. This settles the open decision "Must a public submission answer every question?" with yes, since the runner cannot send without it.
- Store a **snapshot** per item (`answerType`, `answerValue`, `answerLabel`) and `createdAt = now`.
- **Rate limit** in memory per `deviceId` and per IP (`headers()` → `x-forwarded-for`): for example at most 1 submission per 3 s and 30 per 10 min per device. Return the `RATE_LIMITED` code.
- Return `{ ok: true }` or `{ ok: false, error: "NOT_FOUND" | "CLOSED" | "INVALID" | "RATE_LIMITED" }`. The client shows a toast and stays on the question so it can retry.
- After storing, call `revalidatePath("/dashboard")` and `revalidatePath("/surveys")` so counts update.

### Response store

- Move the responses into an in-memory store on `globalThis` (`src/lib/surveys/responses.ts`), seeded from `MOCK_RESPONSES`, with `listResponses(surveyId)` and `addResponse(...)`.
- `getMockSurveyMetrics`, `countMockResponses` and `getAnsweredOptionIds` read from it. A kiosk answer then appears in the dashboard cards and the survey table, and locks the category like a real response.
- Prisma replaces it later with the same API.

### Client metadata

| Field | Value |
| --- | --- |
| `deviceId` | `localStorage["panda-metrics:device-id"]`, created once with `crypto.randomUUID()`; `null` if storage is blocked |
| `locale` | The current UI locale |
| `durationMs` | From the first question shown to Send |
| `source` | `KIOSK` when the code was entered on the code screen (typed, scanned or uploaded); `LINK` when the page opened with `?code=` (shared link or a QR scanned with the phone camera). `QR` is not used (decided: no need to tell QR from link) |

### Double submit

The runner keeps a `submitting` ref plus `useTransition`. Enter and click both go through one guarded `submit()`, and the button is disabled while pending (overview: "a submission is stored once, even with Enter + click").

## 8. QR scanning and code parsing

- **`parseSurveyCode(text)`** (`src/lib/surveys/code.ts`): trim and uppercase, then:
  - if the text is a URL with `?code=`, take that value;
  - otherwise find the first 6-character `[A-Z0-9]` token.

  It returns `null` when nothing matches and never throws. The input, the scanner and the image upload all use it.
- **Camera scan**: a `Dialog` with a `<video>` preview, `getUserMedia({ video: { facingMode: "environment" } })`.
  - It detects every ~250 ms with `BarcodeDetector({ formats: ["qr_code"] })`, using the native one where it exists and otherwise the **`barcode-detector`** polyfill (npm 3.2.2, zxing-wasm based) for Safari and Firefox.
  - On a valid code it closes and navigates.
  - The camera tracks and the interval are stopped on close, on unmount and on success (overview: "never leaves the camera on").
  - Permission denied, no camera, or not HTTPS each get their own message in the dialog, with "Upload QR image" as the fallback.
- **Image upload**: a hidden `<input type="file" accept="image/*">`; the file goes through `createImageBitmap` and then `detect()`. No QR found → "No QR code found in that image".
- **WASM hosting**: the polyfill downloads its zxing `.wasm` from a CDN by default. Self-host it from `public/` and point the polyfill at it, so the kiosk works without third-party requests. Check the package docs for the exact option when implementing.
- The polyfill is loaded with a dynamic `import()` only when the scanner or upload is used, so the code entry stays light.

## 9. Fullscreen

- Fullscreen starts when a code is submitted from the code screen, which is a user gesture: `document.documentElement.requestFullscreen()`. It is wrapped in try/catch because some browsers refuse it.
- The toggle button in the runner enters and leaves fullscreen and reflects `fullscreenchange`.
- After `thanks`, if fullscreen was on and is now off, show `tapToStart`.
- "Exit survey" also leaves fullscreen.
- iPhone Safari has no element fullscreen: hide the toggle and skip `tapToStart`.

## 10. Responsive

| Viewport | Layout |
| --- | --- |
| Desktop / landscape tablet (≥ 1024) | As the screenshots: 125px faces and stars in one row, poll cards up to 240px in one row (wrap to 3 + 2 if 5 do not fit) |
| Portrait tablet (640–1023) | Same row, targets `clamp(88px, 14vw, 125px)` |
| Phone (< 640) | Question `text-3xl`. Faces and stars in one row of 5 with `size = (100% - gaps) / 5` (≈ 60px at 375px), labels `text-xs` under each. Poll cards stacked full width (h-14, label left, number right). Action row full width (OK button stretches). Progress card becomes a bottom bar across the width. |
| Short viewports (height ≤ 520px) | Smaller question type, no hint text, progress card compact (bar + arrows only), content top-aligned so nothing is clipped |

No horizontal overflow at 375 / 768 / 1024 / 1280, in landscape and portrait.

## 11. Accessibility and i18n

- **Headings**: one h1 per screen (the question in the runner). Options are radios with accessible names: the face label, "3 stars", the poll label.
- **Keyboard**:
  - focus rings use `--ring`;
  - every action is reachable with Tab;
  - the keys 1–5, Enter and ↑ / ↓ are announced in a visually hidden hint under the question.
- **Live regions**: the progress text, the thanks message, and errors (toast plus a `role="alert"` inline error on code entry).
- **Motion**: reduced motion respected.
- **Touch**: targets of at least 44px on phones.
- **Messages**: all text goes in a new `kiosk` namespace in `en.json` / `es.json`, using the same Spanish as the reference:
  - "Ingresa el código de la encuesta", "Continuar", "Escanear QR", "Subir imagen QR";
  - "presiona Enter", "OK", "Enviar", "Salir de la encuesta", "{percent}% completado";
  - "La encuesta se envió correctamente", "La encuesta se reiniciará en {seconds} s".

  Question and option text is the survey's own content and is not translated.
- **Theme**: the kiosk follows the app theme (light by default). Dark mode works through the tokens: faces keep their colors, cards are `#1b1e24`.

## 12. Files

| Action | Files |
| --- | --- |
| New | `src/app/(kiosk)/layout.tsx`, `src/app/(kiosk)/s/page.tsx`, `src/components/kiosk/` (`CodeEntry`, `QrScannerDialog`, `SurveyRunner`, `QuestionView`, `FaceOptions`, `StarOptions`, `PollOptions`, `ProgressCard`, `ThanksScreen`, `TapToStart`, `KioskMessage` for not found / closed, `FullscreenToggle`, `ExitSurveyButton`), `src/lib/surveys/public.ts`, `src/lib/surveys/code.ts`, `src/lib/surveys/responses.ts`, `src/actions/kiosk.ts`, `src/components/ui/dialog.tsx` (shadcn) |
| Change | `ReactionFace` (`lg` size + selected state), `src/lib/mock-data.ts` (metrics read the response store), `SharePanel` ("Open survey" enabled), `src/messages/{en,es}.json` (`kiosk`), `context/project-overview.md` (kiosk decisions: Server Actions, every question required, response store) |
| Dependency | `barcode-detector` (3.2.2) and its self-hosted wasm in `public/` |

## 13. Verification

- `yarn lint`, `tsc --noEmit`, `yarn build`. `/s` builds as a partial prerender: static shell, `searchParams` in Suspense.
- Flows, in English and Spanish:
  - valid code (typed, lowercase, pasted URL) → runner;
  - unknown code → not found;
  - inactive survey → closed;
  - answer every category with mouse, touch and keyboard (1–5, Enter, ↑ / ↓);
  - Send → thanks → countdown → restart with empty answers.
- **Data**: a sent response raises the survey's count on the dashboard and in the table, appears in the metrics of the chosen options, and locks the category in the form. Enter + click stores one response. Rapid repeat submissions get `RATE_LIMITED`.
- **QR**:
  - scan the share panel's QR with the camera (Chrome, Safari, Firefox);
  - upload the downloaded PNG;
  - closing the dialog turns the camera light off;
  - permission denied shows its message.
- **Fullscreen**: entered on Continue; the toggle works; after a restart that lost fullscreen, "Tap to start" brings it back. The toggle is hidden on iPhone.
- **Screenshots** at 375 / 768 / 1024 / 1280 (and 1024×500 landscape), light and dark: no overflow, targets of the planned size, the primary used as in section 6.
- **Accessibility**: one h1 per screen, radios announced with their labels, focus moves to each new question, reduced motion shortens the transition.

## 14. Phases

1. **Route, data and code entry**: the `(kiosk)` group and `/s` with Suspense, `getPublicSurvey`, `parseSurveyCode`, the code entry screen (primary Continue, Scan / Upload shown but disabled "coming soon" until phase 4), not found / closed screens, the "Open survey" button enabled, the `kiosk` messages.
2. **Runner**:
   - the question screen with faces (`ReactionFace lg`), stars and poll cards;
   - selection, OK / Send, keys, ↑ / ↓, the progress card;
   - transitions with reduced motion;
   - exit with confirmation, fullscreen toggle;
   - responsive and short-viewport layouts.
3. **Submit and restart**:
   - the response store feeding the metrics;
   - the `submitSurveyResponse` action (validation, snapshot, every question required, rate limit, revalidation);
   - double-submit guard;
   - `deviceId` / `locale` / `durationMs` / `source` (`KIOSK` or `LINK`);
   - thanks with countdown, reset, tap to start.
4. **QR**: `barcode-detector` with self-hosted wasm, the camera scanner dialog with cleanup and error states, image upload.

## 15. Decisions (confirmed)

- **Every question must be answered** before sending: OK / Send stay disabled until an option is chosen, and the server rejects incomplete submissions.
- **Select, then OK** (as the reference); tapping an option never advances on its own.
- **Thanks countdown of 5 seconds**, then the runner restarts.
- **No `QR` source**: responses are `KIOSK` (code entered on the code screen) or `LINK` (opened with `?code=`); the QR keeps encoding the plain public link.
- **Poll image options** stay out until image upload exists; poll options render as text cards.
