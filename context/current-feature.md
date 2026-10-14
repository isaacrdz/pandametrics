# Current Feature: Survey Form

## Status

In Progress

## Goals

### Phase 1: Form shell, pages and persistence

- Packages (`react-hook-form`, `zod`, `@hookform/resolvers`, `qrcode`, `@types/qrcode`, `server-only`) and shadcn `field`, `label`, `textarea`, `switch`, `alert`, `alert-dialog`, `radio-group`
- `src/lib/surveys/schema.ts`: Zod 4 schema with one question / option shape and per-category rules in `.check()` (a discriminated union of field arrays does not bind well with react-hook-form), limits (name 120, description 500, question 300, reaction label 40, poll label 80), error keys as messages
- `src/lib/surveys/service.ts` (`server-only`):
  - `globalThis` in-memory store seeded from the mock;
  - list / get / create / update / soft delete / count active / has responses;
  - ObjectId-like ids, 6-char codes without reserved tokens;
  - merge by `id` with archiving by omission, archive + new option when a used option changes, generated rating options.
- `src/lib/surveys/form-values.ts` (`toFormValues`, empty values, category templates); `src/lib/dashboard.ts` reads from the store
- `src/actions/surveys.ts`:
  - `createSurvey` and `updateSurvey` with Zod, try/catch and `{ success, data, error: { code, fieldErrors? } }`;
  - error codes `ACTIVE_LIMIT` and `CATEGORY_LOCKED`;
  - `revalidatePath` + `refresh()`; create returns the id and the client navigates to the edit page (so the "Survey created" toast can show).
- Pages:
  - `/surveys/new` is static.
  - `/surveys/[id]` awaits `params` inside `<Suspense>` with a skeleton and calls `notFound()` for missing, deleted or foreign surveys; it also has a `loading.tsx`.
- Client `SurveyForm` with `FORM_MODES` (copy keys, visible sections, action), `SurveyFormHeader`, `FormSection`, `SurveyDetailsSection`, `PublishToggle` (inline active-limit error), `CategoryPicker` (3 cards, locked with an alert when the survey has responses, confirm on change in create), `SurveyFormSkeleton`
- Messages `surveyForm`, `categories`, `validation` in both languages

### Phase 2: Questions and per-category options

- `QuestionsSection` (`useFieldArray` with `keyName: "fieldKey"`, add / remove, focus on new) and `QuestionEditor`
- `ReactionOptionsEditor` (unused-reaction select, color input, face preview, label), `RatingOptionsPreview`, `PollOptionsEditor` (2–5)
- `OptionsCounter` badge, limit alert, "Add answer" disabled at 5, duplicate reactions reported on the row
- Default reaction / rating labels from the active locale (`reactions.*`, `ratings.*`)

### Phase 3: Share panel and delete

- `SharePanel`:
  - QR as inline SVG from `QRCode.create`, PNG download;
  - link and code with `CopyButton`;
  - "Open survey" disabled with a tooltip;
  - created at / by.
- `deleteSurvey` (soft delete, revalidate, redirect) and `DeleteSurveyDialog`

### Phase 4: Polish

- `UnsavedChangesDialog` on Back when dirty, `beforeunload` while dirty
- 500px layout, accessibility (labels, `aria-invalid`, focus on first error and new rows, numbered button labels), dark mode check

### Verification

- `yarn lint`, `tsc`, `yarn build` pass; no `blocking-route` warnings
- Create Satisfaction, Rating and Poll surveys → redirect to edit with a toast; active ones appear on the dashboard
- Edit PROD91: values loaded, category locked, save keeps the page and updates the dashboard
- Removed option with answers still shows as "(removed)" on the dashboard
- Sixth active survey fails with `ACTIVE_LIMIT`; unknown / deleted / foreign id → 404
- Limits enforced (reactions unique, max 5; poll 2–5); QR points to `/s?code=`; delete confirms and removes from the dashboard
- English and Spanish, desktop and 500px, dark mode

## Notes

- Spec: `context/features/survey-form-spec.md`. Research: `docs/survey-form.md`. Screenshots: `context/screenshots/form-create-edit-1.png`, `-2-1.png`, `-2-2.png`, `-3.png`
- `form-create-edit-2-2.png` shows Kraquen bugs not to reproduce: 6/5 options, an invalid "?" reaction, a per-option "Tipo" select, the `app.kraquen.io` link and the blue "Muy bueno"
- Children of `SurveyForm` never read `mode`; only `FORM_MODES` does. Pages cannot translate or pass functions, so they pass `mode`, values and `meta`
- Server Actions return error codes; the client translates them (the language is in `localStorage`). Zod messages are keys translated with `t("validation.<key>")`
- Translated text only in Client Components; all copy in `src/messages/{en,es}.json` (same keys, `react/jsx-no-literals`)
- `params` is runtime data under Cache Components: read it inside `<Suspense>`
- The in-memory store resets on server restart and is per process; acceptable until Prisma
- Out of scope: reordering, poll images, kiosk `/s` route, surveys list page (sidebar "Surveys" stays disabled)
- Creating end to end works from phase 2; edit of details works after phase 1. Implement and review one phase at a time

## History

<!-- Keep this updated. Earliest to latest -->

- **Init Project** (2026-10-13): cleaned the Create Next App boilerplate (index only shows an `h1` with "Panda Metrics"), moved `app/` to `src/app/` with `@/*` → `./src/*`, light theme by default with a `.dark` class, Geist font applied, removed boilerplate SVGs, new README, ignored `.claude/settings.local.json`, and connected `origin` to `git@github.com:Ellyonsoft/panda-metrics.git`
- **Dashboard View** (2026-10-13): shadcn/ui (Nova, Radix, Lucide) with Panda Metrics theme tokens, `next-themes` (light default) and sonner; app shell with collapsible sidebar (Dashboard, Encuestas, Historial, Configuración) and top bar; `/` redirects to `/dashboard`; stat cards (Respuestas totales, Encuestas activas, Respuestas hoy), search and date range in the URL inside `Suspense`, skeletons and empty states; survey cards with question carousel and Satisfaction / Rating / Poll charts, icon buttons to copy link, copy code and edit; data from `src/lib/mock-data.ts` through `src/lib/dashboard.ts`
- **Internationalization** (2026-10-13): next-intl without URL routing; language in `localStorage` (`panda-metrics:locale`, English default, Spanish) read by a client `LocaleProvider`, inline head script that hides the page until a non-default language is applied, remount on the first locale divergence to avoid hydration mismatches in streamed Suspense boundaries; server renders English, translated text in Client Components; all copy in `src/messages/{en,es}.json` with ICU plurals, formatting through `useFormatter` (`en-US` / `es-MX`); `LanguageSwitcher` with SVG flags in the top bar; `react/jsx-no-literals` and message key parity check in `yarn lint`
