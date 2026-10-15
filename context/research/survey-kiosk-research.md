# Survey Kiosk (answer a survey)

## Output

`docs/survey-kiosk.md`

## Research

Document the public view where a respondent answers a survey (the kiosk at `/s?code=`), based on the four reference screenshots in `context/screenshots/`:

1. `survey-landing-1.png`: code entry ("Ingresa el código de la encuesta", 6-character code input, "Continuar →", "Escanear QR", "Subir imagen QR").
2. `survey-landing-2.png`: a question with large round options and labels, "presiona Enter ↵" + "OK →", top-right fullscreen and "Salir de la encuesta", bottom-right progress card ("0% completado", bar, up / down buttons).
3. `survey-landing-3.png`: a Satisfaction question with the five faces (tinted circles, the selected one with a solid border, glow and check badge), last question with "Enviar →" and 100% progress.
4. `survey-landing-4.png`: thank-you screen ("La encuesta se envió correctamente", "La encuesta se reiniciará en 1s").

Buttons that need emphasis use the project primary color (`--primary`, blue `#4263eb`). The result must be detailed enough to write phase specs.

## Include

Current state:

- What exists for public answering today (public URL format, the disabled "Open survey" button in the share panel, the kiosk plan in `context/project-overview.md` sections 1, 2, 7, 8, 9 and 13).
- Survey data model (`Survey`, `Question`, `AnswerOption`, `SurveyResponse`, `ResponseItem`, categories and answer types), the in-memory survey store and the static mock responses that feed the metrics.
- Reusable pieces: `ReactionFace`, `StarRow`, `Logo`, `LanguageSwitcher`, shadcn components, `qrcode`, i18n and theme setup, the root layout.

What to define:

- Route and layout (route group, no sidebar, static shell vs reading `?code=`, metadata / noindex).
- The kiosk state machine and each screen (code entry, loading, not found, closed, question, submitting, thanks with countdown, tap to start), matched to the screenshots and adapted to Panda Metrics tokens.
- Answer UI per category (faces, stars, poll text cards), selection, OK / Enter, keys 1–5, ↑ / ↓, progress card, transitions and reduced motion, exit, fullscreen.
- Where the primary color is used (and where outline or neutral buttons are used instead).
- Data: reduced public survey, submit action (validation, snapshot, metadata, double-submit guard, rate limit), where new responses are stored so the dashboard counts them.
- QR scanning with the camera and from an uploaded image (polyfill for Safari / Firefox, camera cleanup), code parsing.
- Responsive rules (desktop kiosk, tablet, phone, short viewports), accessibility and i18n.
- Verification and phases.
- Decisions: every question required, select then OK, 5-second thanks countdown, no separate `QR` source (`KIOSK` / `LINK` only).

## Sources

- @context/screenshots/survey-landing-1.png
- @context/screenshots/survey-landing-2.png
- @context/screenshots/survey-landing-3.png
- @context/screenshots/survey-landing-4.png
- @context/project-overview.md
- @src/types/survey.ts
- @src/lib/surveys/service.ts
- @src/lib/mock-data.ts
- @src/lib/dashboard.ts
- @src/components/surveys/ReactionFace.tsx
- @src/components/surveys/form/SharePanel.tsx
- @src/app/layout.tsx
- `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md` (`searchParams` inside `Suspense`)
- `barcode-detector` on npm (BarcodeDetector polyfill)
