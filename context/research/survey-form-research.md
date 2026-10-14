# Survey Form (Create and Edit)

## Output

`docs/survey-form.md`

## Research

Document how to build the survey create view (`/surveys/new`) and edit view (`/surveys/[id]`) from the form screenshots.

The key constraint: **both pages reuse one `SurveyForm` component**. Only the page around it changes:

- the title and subtitle;
- the default values (empty vs. the stored survey);
- the submit action (create vs. update);
- which actions and sections are available (delete, share panel, category lock).

The result must be detailed enough to split the work into phased feature specs.

## Include

Current state:

- What exists today:
  - `/dashboard` with "View / Edit" linking to `/surveys/[id]` and "New survey" / "Create survey" linking to `/surveys/new` (both 404 now);
  - the sidebar "Surveys" item disabled;
  - the Survey types in `src/types/survey.ts`;
  - the in-memory mock (`src/lib/mock-data.ts`) behind `src/lib/dashboard.ts`;
  - next-intl with the language in `localStorage` (translated text only in Client Components);
  - `cacheComponents: true`.
- What is not installed yet: react-hook-form, Zod, `@hookform/resolvers`, `qrcode`, and the shadcn components a form needs (`form` / `field`, `label`, `textarea`, `switch`, `alert`, `alert-dialog`, `radio-group` or `toggle-group`).

Screen description, from `form-create-edit-1.png`, `form-create-edit-2-1.png`, `form-create-edit-2-2.png` and `form-create-edit-3.png`, section by section:

- **Page header**: title ("Editar encuesta") and subtitle ("Actualiza la experiencia y las opciones de respuesta de tu encuesta."); actions on the right: "Regresar" (outline), "Borrar" (destructive outline), "Guardar Encuesta" (primary with check icon).
- **Section 01 "Detalles de la encuesta"**:
  - numbered tile + title + subtitle;
  - "Nombre" (required, red asterisk) and "Descripción" (textarea);
  - "Publicar encuesta" card with a globe icon, an "Activa" badge, a helper text and a switch, all on a green tint when active.
- **Section 02 "Preguntas"**:
  - "Pregunta 01" (required) with a delete icon;
  - "Opciones de respuesta" with helper text and a counter badge ("5/5 respuestas");
  - an info alert "Límite de 5 respuestas alcanzado.";
  - one row per option: "Tipo" select (Reacción), color bar, face preview, "Opción N" floating-label input, delete icon;
  - "Agregar Respuesta" (disabled at the limit) and "Agregar Pregunta" (dashed).
- **Section 03 "Compartir"** (edit only):
  - QR panel with "Escanear código QR" and "Descargar QR";
  - "Enlace público" read-only field with a copy icon, and "Código" with a copy icon;
  - "Abrir Encuesta" and "Copiar Enlace" buttons;
  - "Creado el: …" and "Creado por: …" footer.

Issues visible in the screenshots, which Panda must not reproduce (`form-create-edit-2-2.png` is Kraquen's current behavior):

- 6 options shown with "6/5 respuestas" (the limit is not enforced)
- A "Reacción" option with a free-text label ("hamburguesa") and a "?" face (an invalid reaction value)
- A per-option "Tipo" select, while Panda fixes the option type by survey category
- The public link points to `app.kraquen.io/survey?code=`; Panda derives it from `PANDA_PUBLIC_URL` + `/s?code=`
- The "Muy bueno" blue color vs. the overview palette

Shared form design (the core of the research):

- One `SurveyForm` Client Component in `src/components/surveys/form/`.
  - Props: `mode: "create" | "edit"`, `defaultValues`, the submit Server Action, optional `survey` metadata for edit (id, code, createdAt, createdBy, hasResponses, publicUrl).
  - Explain how create and edit differ only through props, with no `if (mode)` scattered in children.
- Pages:
  - `src/app/(app)/surveys/new/page.tsx` and `src/app/(app)/surveys/[id]/page.tsx` stay Server Components;
  - they load data (edit), map it to form values and pass the action;
  - `notFound()` for unknown or deleted ids, and for ids of another organization (404, not 403).
- Sub-components and their files:
  - `SurveyFormHeader` (title, subtitle, actions by mode);
  - `SurveyDetailsSection`, `PublishToggle`, `CategoryPicker`;
  - `QuestionsSection`, `QuestionEditor`, `AnswerOptionsEditor` / `AnswerOptionRow` per category;
  - `SharePanel` (edit only), `DeleteSurveyDialog`.
- Which ones need `'use client'`, and which shadcn components each uses.

Category per survey (overview sections 1 and 5), and how the form handles it:

- New surveys start with a category picker. Three cards (Satisfaction, Rating, Poll), each with a small preview of faces, stars or poll options.
- Changing the category is allowed only while the survey has no responses. Locked in edit when `hasResponses`; explain how the form shows it.
- Per-category option editors, replacing the screenshot's per-option "Tipo" select:
  - **Satisfaction**: 1 to 5 reactions from `VERY_BAD` … `INCREDIBLE`, no duplicates, editable label and color, face preview.
  - **Rating**: question text only; the 5 star options are generated (show a read-only preview).
  - **Poll**: 2 to 5 TEXT or IMAGE options. Image upload to S3 is out of scope here: decide a placeholder (URL input or disabled) until the uploads feature.
- Default labels for new reaction / rating options come from the creator's active locale (messages) and are stored with the survey.

Validation and data:

- Zod schemas in a shared module (`src/lib/surveys/schema.ts` or similar), used by the client (react-hook-form resolver) and the Server Action.
  - Use a discriminated union on `category`.
  - Rules: name required and length limits, at least 1 question, question text required, option rules per category as above, max 5 options per question, unique reaction values.
  - Translated error messages: how Zod messages map to next-intl keys.
- `useFieldArray` for questions and options.
  - Keep the embedded `id` of existing questions and options in hidden fields so the update can preserve them.
  - Removed items are archived, not deleted (overview "Preserving ids on update"). Explain how the form tracks removals.
- Server Actions (coding standards: Server Actions for forms, try/catch, `{ success, data, error }`, validate with Zod):
  - `createSurvey`, `updateSurvey`, `deleteSurvey` (soft delete), `setSurveyActive`;
  - where they live (`src/actions/surveys.ts`);
  - how they receive the locale for messages (no `root-params`, language comes from the client).
- Mock persistence until Prisma:
  - a mutable in-memory store behind the same data module (`src/lib/surveys.ts` or extending `src/lib/dashboard.ts`), with the limits of that approach (per server process, reset on restart);
  - how the functions map 1:1 to the future Prisma services so only the implementation changes;
  - code generation (6 chars A-Z0-9, reserved tokens), ObjectId-like ids, `createdAt` / `updatedAt`.
- 5-active limit: activating (or creating as active) when 5 are active must fail with a clear error. Show it in the publish toggle and as a toast.
- After save:
  - create redirects to `/surveys/[id]` (or back to the dashboard?), edit stays with a toast;
  - how the dashboard and edit page refresh under Cache Components (`refresh()`, `revalidatePath`, `updateTag` — check what Next 16 recommends in `node_modules/next/dist/docs/`).

UX and behavior:

- "Back" with unsaved changes (confirm dialog or `beforeunload`); "Delete" with `AlertDialog` confirmation (edit only).
- Save button: disabled while submitting, loading state, prevents double submit; errors shown inline and as a toast.
- Counter badge and limit alert per question; "Add answer" disabled at the limit; "Add question" adds an empty question for the category.
- Reordering questions or options: in scope or not (the overview mentions reorder on the detail page). Recommend.
- Share panel (edit only):
  - QR generated on the client with `qrcode` from `publicUrl`, with PNG download;
  - public link and code with copy buttons (reuse `CopyButton`);
  - "Open survey" opens `/s?code=` in a new tab (kiosk route not built yet: decide what it shows);
  - created at / created by, formatted with `useFormatter`.
- Create-mode differences: no delete, no share panel; title "New survey"; publish toggle off by default.

Layout, i18n and accessibility:

- Same app shell (sidebar + top bar). Sidebar "Surveys" stays disabled until the list exists, or links to the dashboard. Decide.
- Numbered section cards as in the screenshots, using the existing theme tokens. Responsive at 500px: option rows stack, actions wrap.
- All copy in `src/messages/{en,es}.json` (new namespaces such as `surveyForm`), ICU plurals for counters ("{count}/5 answers"), `react/jsx-no-literals` compliant.
- Labels tied to inputs, `aria-invalid` and error descriptions, focus moved to the first error on submit, keyboard-reachable add / delete buttons with labels including the question / option number, switch with an accessible name.

Phases:

1. Shared `SurveyForm` shell, schema and pages: header, details, publish toggle, category picker, create and edit wiring with mock persistence
2. Questions and per-category option editors with limits, ids and archiving
3. Share panel (QR, link, code, metadata) and delete
4. Unsaved changes guard, dashboard refresh, responsive, accessibility pass

Recommendation: the simplest approach that fits the project's patterns, coding standards (Server Actions + Zod, `{ success, data, error }`), next-intl with the language in `localStorage`, and Next.js 16 with Cache Components.

## Sources

- @context/project-overview.md
- @context/coding-standars.md
- @src/types/survey.ts
- @src/lib/mock-data.ts
- @src/lib/dashboard.ts
- @src/components/dashboard/SurveyCard.tsx
- @src/components/dashboard/CopyButton.tsx
- @src/components/surveys/ReactionFace.tsx
- @src/components/surveys/StarRow.tsx
- @src/i18n/LocaleProvider.tsx
- @src/messages/en.json
- @context/screenshots/form-create-edit-1.png
- @context/screenshots/form-create-edit-2-1.png
- @context/screenshots/form-create-edit-2-2.png
- @context/screenshots/form-create-edit-3.png
- @docs/dashboard.md
- @docs/i18n.md
- shadcn/ui documentation (context7): Form / Field with react-hook-form, Switch, AlertDialog, Textarea
- react-hook-form and Zod documentation (context7): `useFieldArray`, discriminated unions, resolvers
- `node_modules/next/dist/docs/`: Server Actions / mutating data, forms, revalidation and `refresh` with Cache Components, `notFound`, dynamic params
