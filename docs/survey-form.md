# Survey Form (Create and Edit)

How to build `/surveys/new` and `/surveys/[id]` from the form screenshots. **Both pages reuse a single `SurveyForm`**; only the page around it changes:

- the title and subtitle;
- the default values;
- the submit action;
- the available actions and sections.

Researched on 2026-10-13 against `main` at `85ec233`. Sources:

- Next.js 16.4 docs in `node_modules/next/dist/docs/` (mutating data, `refresh`, `updateTag`, params with Cache Components);
- shadcn/ui Field + react-hook-form docs, react-hook-form `useFieldArray` and Zod 4 (context7);
- the four `form-create-edit-*.png` screenshots.

## 1. Current state

| Area | Today |
| ---- | ----- |
| Routes | `/dashboard` only. "View / Edit" links to `/surveys/[id]`, "New survey" and "Create survey" link to `/surveys/new`: both 404 |
| Sidebar | "Surveys" item disabled ("Coming soon") |
| Types | `src/types/survey.ts` mirrors the Prisma models (`Survey`, `Question`, `AnswerOption`, …) |
| Data | `src/lib/mock-data.ts` builds `MOCK_SURVEYS` (a `const` array) and `MOCK_RESPONSES`; `src/lib/dashboard.ts` is the only reader. Nothing can be written |
| i18n | next-intl, language in `localStorage`, server always renders English, translated text only in Client Components |
| Rendering | `cacheComponents: true`; the dashboard reads data inside `<Suspense>` after awaiting `searchParams` |
| Reusable UI | `CopyButton`, `ReactionFace`, `StarRow`, `MetricBar`, `EmptyState`, theme tokens (`card-border`, `highlight`, `success`, reaction colors) |

Not installed yet (latest versions checked on npm):

| Package | Version | Use |
| ------- | ------- | --- |
| `react-hook-form` | 7.90 | Form state, `useFieldArray` |
| `zod` | 4.6 | Shared schema (client + Server Action) |
| `@hookform/resolvers` | 5.9 | `zodResolver` |
| `qrcode` + `@types/qrcode` | 1.5 | QR in the share panel |
| `server-only` | — | Guard the mock service from client imports |
| shadcn components | — | `field`, `label`, `textarea`, `switch`, `alert`, `alert-dialog`, `radio-group` |

## 2. Screen description

### Page header (`form-create-edit-1.png`)

- Title "Editar encuesta" (bold, ~28px) and subtitle "Actualiza la experiencia y las opciones de respuesta de tu encuesta."
- Actions on the right:
  - "Regresar" (outline, purple text);
  - "Borrar" (outline, red text and border);
  - "Guardar Encuesta" (primary, check icon, soft shadow).
- Sits on the page background, above the section cards.

### Section 01 "Detalles de la encuesta"

- White card, large radius. Numbered tile ("01", lavender background, purple text) + title + subtitle "Dale a tu encuesta un nombre claro y un poco de contexto."
- "Nombre *" (red asterisk) on a filled light input; "Descripción" on a textarea (~3 rows, purple focus border).
- "Publicar encuesta" card:
  - green tint and green border when active;
  - globe icon tile, title, "Activa" badge (green);
  - helper text "La encuesta está publicada y tus clientes pueden responderla mediante su enlace o código QR.";
  - switch on the right.

### Section 02 "Preguntas" (`form-create-edit-2-1.png`)

- Numbered tile "02", title, subtitle "Haz una pregunta concreta y consigue que cada respuesta cuente."
- "Pregunta 01 *" label with a trash icon on the right; full-width input.
- "Opciones de respuesta" with helper text "Personaliza las etiquetas que verán las personas encuestadas. Máximo 5 respuestas por pregunta." and a purple counter badge "5/5 respuestas".
- Info alert (light blue, info icon) "Límite de 5 respuestas alcanzado." when the limit is reached.
- One row per option, each in a bordered box:
  - "Tipo" select (Reacción);
  - a vertical color bar (the option color);
  - the face preview;
  - an "OPCIÓN N" floating-label input;
  - a trash icon.
- "Agregar Respuesta" (disabled at the limit) and, after the last question, "Agregar Pregunta" (dashed border, purple).

### Section 03 "Compartir" (`form-create-edit-3.png`)

- Numbered tile "03", title, subtitle "Comparte el enlace público o permite que tus clientes escaneen el código QR."
- Left panel (lavender tint): "Escanear código QR" label, the QR on a white tile, "Descargar QR" (outline, full width).
- Right side:
  - "Enlace público": a read-only filled field with a copy icon;
  - "Código": monospace, letter-spaced, in a small box with a copy icon;
  - "Abrir Encuesta" (outline, external-link icon) and "Copiar Enlace" (primary, copy icon).
- Footer under a divider: calendar icon "Creado el: 22/9/2026, 4:01:56 p.m." and user icon "Creado por: Miguel Rayon (email)".

### What Panda does differently

`form-create-edit-2-2.png` shows Kraquen's current behavior. Panda must not reproduce it:

| Screenshot | Panda |
| ---------- | ----- |
| 6 options with "6/5 respuestas" | Hard limit: "Add answer" disabled at 5 and the schema rejects more |
| A "Reacción" option labeled "hamburguesa" with a "?" face | A reaction option's value is one of the 5 reaction values, so the face is always valid; the label is free text |
| A per-option "Tipo" select | The option type comes from the survey **category** (section 4); no per-option type |
| Public link `app.kraquen.io/survey?code=` | `PANDA_PUBLIC_URL` + `/s?code=` (`getPublicSurveyUrl` already exists) |
| "Muy bueno" in blue | Overview palette (`#84cc16`) as the default, editable per option |
| "Created by" shows a personal email | Shows the creator's name and email from the user record |

## 3. One form, two pages

### Pages (Server Components)

```
src/app/(app)/surveys/
├── new/page.tsx          <SurveyForm mode="create" defaultValues={EMPTY_SURVEY} />
└── [id]/
    ├── page.tsx          awaits params inside <Suspense>, loads the survey, notFound() if missing
    └── loading.tsx       form skeleton
```

- `new/page.tsx` has no runtime data and is fully static.
- `[id]/page.tsx`: `params` is runtime data under Cache Components (no `generateStaticParams` for survey ids). Following the dashboard pattern, the page is not async: it passes the `params` promise to an inner async component inside `<Suspense fallback={<SurveyFormSkeleton />}>`. That component:
  - awaits the params;
  - calls `getSurveyForEdit(organizationId, id)`;
  - calls `notFound()` when the survey is missing, soft-deleted or belongs to another organization (404, not 403, as in the overview).
- The server maps the stored `Survey` to form values (`toFormValues(survey)`). Archived questions and options are left out, because the form never shows them. The page passes:
  - `mode="edit"`;
  - the form values;
  - `meta: { id, code, publicUrl, createdAt, createdBy: { name, email }, hasResponses }`.

### `SurveyForm` and the mode table

The only place that knows about `mode` is a small table in the form module. Children receive plain props, never `mode`:

```ts
// src/components/surveys/form/form-modes.ts ('use client' module, imports Server Actions)
export const FORM_MODES = {
  create: {
    titleKey: "createTitle",
    subtitleKey: "createSubtitle",
    submitKey: "create",
    showDelete: false,
    showShare: false,
    lockCategory: () => false,
    submit: (values: SurveyFormValues) => createSurvey(values),
  },
  edit: {
    titleKey: "editTitle",
    subtitleKey: "editSubtitle",
    submitKey: "save",
    showDelete: true,
    showShare: true,
    lockCategory: (meta: SurveyFormMeta) => meta.hasResponses,
    submit: (values: SurveyFormValues, meta: SurveyFormMeta) => updateSurvey(meta.id, values),
  },
} as const;
```

```tsx
// SurveyForm.tsx (sketch)
const config = FORM_MODES[mode];
<form onSubmit={form.handleSubmit(onSubmit)} noValidate>
  <SurveyFormHeader title={t(config.titleKey)} subtitle={t(config.subtitleKey)}
    submitLabel={t(config.submitKey)} isSubmitting={isPending}
    onBack={handleBack} onDelete={config.showDelete ? openDeleteDialog : undefined} />
  <SurveyDetailsSection />                                   {/* name, description, publish */}
  <CategoryPicker locked={config.lockCategory(meta)} />
  <QuestionsSection />
  {config.showShare && meta && <SharePanel {...meta} />}
</form>
```

- The page cannot translate (the language is in the browser) and cannot pass functions to a Client Component. So the page passes only `mode`, values and `meta`, and the client-side table picks the copy keys and the Server Action. Server Actions can be imported into Client Components.
- All sections read and write through `useFormContext()` (`FormProvider`), so they do not need value props.

### Components

| Component | File (`src/components/surveys/form/`) | Client | shadcn / existing |
| --------- | ------------------------------------- | ------ | ----------------- |
| `SurveyForm` | `SurveyForm.tsx` | yes | `FormProvider`, `useTransition`, `sonner` |
| `SurveyFormHeader` | `SurveyFormHeader.tsx` | yes | `Button` |
| `FormSection` | `FormSection.tsx` | no (shared) | numbered tile + title + subtitle + card |
| `SurveyDetailsSection` | `SurveyDetailsSection.tsx` | yes | `Field`, `FieldLabel`, `FieldError`, `Input`, `Textarea` |
| `PublishToggle` | `PublishToggle.tsx` | yes | `Switch`, `Badge` |
| `CategoryPicker` | `CategoryPicker.tsx` | yes | `RadioGroup` styled as 3 cards, `ReactionFace`, `StarRow`, `Alert` (locked) |
| `QuestionsSection` | `QuestionsSection.tsx` | yes | `useFieldArray("questions")`, `Button` |
| `QuestionEditor` | `QuestionEditor.tsx` | yes | `Field`, `Input`, delete `Button` |
| `ReactionOptionsEditor` | `ReactionOptionsEditor.tsx` | yes | `useFieldArray`, `Select`, color input, `ReactionFace`, `Alert` |
| `RatingOptionsPreview` | `RatingOptionsPreview.tsx` | yes | `StarRow` (read-only) |
| `PollOptionsEditor` | `PollOptionsEditor.tsx` | yes | `useFieldArray`, `Input`, `Alert` |
| `OptionsCounter` | `OptionsCounter.tsx` | yes | `Badge` with ICU plural |
| `SharePanel` | `SharePanel.tsx` | yes | `QrCode`, `CopyButton`, `Button`, `Separator` |
| `QrCode` | `QrCode.tsx` | yes | `qrcode` (SVG render + PNG download) |
| `DeleteSurveyDialog` | `DeleteSurveyDialog.tsx` | yes | `AlertDialog` |
| `UnsavedChangesDialog` | `UnsavedChangesDialog.tsx` | yes | `AlertDialog` |
| `SurveyFormSkeleton` | `SurveyFormSkeleton.tsx` | yes | `Skeleton` |

Everything with text is a Client Component (language in `localStorage`). `FormSection` only lays out props passed by client parents.

## 4. Category and per-category options

Every survey has a `category` (overview sections 1 and 5) that decides the option type. The screenshot's per-option "Tipo" select disappears.

### Category picker

- Three selectable cards in a `RadioGroup` (keyboard: arrow keys), each with a mini preview:
  - **Satisfaction**: 5 small faces;
  - **Rating**: a row of 5 stars;
  - **Poll**: two option pills.
  - Each card also has a title and a one-line description.
- **Create**: shown right after "Details". No category is selected at first, and the questions section shows a hint until one is picked. Choosing a category sets the default question template.
- **Changing it in create** when questions already have content asks for confirmation, because options are rebuilt for the new category; question texts are kept.
- **Edit**: shown in compact form (only the selected card). It is locked when `hasResponses`, with an info `Alert`: "The category can't change because this survey already has responses." The server enforces the same rule.

### Option editors

| Category | Question form | Rules (shared Zod schema) |
| -------- | ------------- | ------------------------- |
| Satisfaction | Text + 1 to 5 reaction rows | Each row: `value` (one of `VERY_BAD` … `INCREDIBLE`, no duplicates), `label` (required, max 40), `color` (hex) |
| Rating | Text only | The 5 star options (`1` … `5`) are generated by the service; the form shows a read-only stars preview |
| Poll | Text + 2 to 5 option rows | Each row: `label` (required, max 80), `color` (defaults to the poll fallback colors) |

Satisfaction row layout, replacing the screenshot's "Tipo" select:

- a reaction `Select` that lists only the values not used by other rows;
- the color bar, which is a native color input styled as the bar, with an `aria-label`;
- the face preview (`ReactionFace`);
- the label input;
- the delete button.

"Add answer" appends the first unused reaction with its default label and color.

**Poll images**: S3 uploads are a separate feature. The schema keeps `type: "TEXT" | "IMAGE"` for the future, but this form only creates `TEXT` options.

**Default labels** come from the creator's active locale (`reactions.VERY_BAD`, …, `ratings.label` messages) and are stored with the survey. They are never re-translated, because responses keep a snapshot. The mock's `REACTION_OPTIONS` labels (Spanish) stay as seed data only.

## 5. Validation, data and actions

### Shared schema

`src/lib/surveys/schema.ts`, imported by the form (resolver) and the Server Actions:

```ts
import * as z from "zod";

const LIMITS = { name: 120, description: 500, question: 300, reactionLabel: 40, pollLabel: 80 };

const id = z.string().regex(/^[0-9a-f]{24}$/).optional();   // present for existing items
const text = (max: number) => z.string().trim().min(1, { error: "required" }).max(max, { error: "tooLong" });

const reactionOption = z.object({ id, value: z.enum(REACTION_VALUES), label: text(LIMITS.reactionLabel), color: hexColor });
const pollOption = z.object({ id, label: text(LIMITS.pollLabel), color: hexColor });

const base = {
  name: text(LIMITS.name),
  description: z.string().trim().max(LIMITS.description, { error: "tooLong" }),
  isActive: z.boolean(),
};

export const surveyFormSchema = z.discriminatedUnion("category", [
  z.object({ ...base, category: z.literal("SATISFACTION"),
    questions: z.array(z.object({ id, text: text(LIMITS.question),
      options: z.array(reactionOption).min(1, { error: "minOptions" }).max(5, { error: "maxOptions" })
        .check(uniqueReactionValues) })).min(1, { error: "minQuestions" }) }),
  z.object({ ...base, category: z.literal("RATING"),
    questions: z.array(z.object({ id, text: text(LIMITS.question) })).min(1, { error: "minQuestions" }) }),
  z.object({ ...base, category: z.literal("POLL"),
    questions: z.array(z.object({ id, text: text(LIMITS.question),
      options: z.array(pollOption).min(2, { error: "minOptions" }).max(5, { error: "maxOptions" }) }))
      .min(1, { error: "minQuestions" }) }),
]);

export type SurveyFormValues = z.infer<typeof surveyFormSchema>;
```

- **Error messages are keys** (`required`, `tooLong`, `minOptions`, …). `FieldError` translates them on the client with `t(\`validation.${message}\`)`, passing the limits. That keeps the schema language-free and lets the server return the same keys.
- **Duplicate reactions**: `.check()` pushes an issue on `options[i].value`, so the error shows next to the row.
- **Category not chosen yet**: in create the form starts with `category: undefined`. The submit button stays enabled; on submit the resolver reports `category: required` and focuses the picker.

### Ids and archiving

- Existing questions and options keep their `id` in the form values (not rendered). New items have no `id`. `useFieldArray` uses its own `keyName` for React keys, so it never overwrites the stored `id`: set `keyName: "fieldKey"` to avoid confusion.
- **Removals are not tracked in the form.** Following the overview ("Preserving ids on update"), the service merges by `id`:
  - items in the payload with an `id` are updated in place;
  - items without one get a new ObjectId;
  - stored items missing from the payload are kept with `archivedAt` set.
  - The form simply omits removed rows, and the past answers of removed items still resolve in metrics.
- Changing a reaction option's `value` when it has answers: the service archives the old option and creates a new one, so snapshots never lie. Same rule as "Retyping an option that has answers".
- Relabeling never creates a new option (responses keep a snapshot of the label). A poll option's `value` is fixed when it is created, so fixing a typo in an answered poll option keeps its answers. Decided during the phase 2 review.

### Server Actions

`src/actions/surveys.ts` (`'use server'`), following the coding standards: Zod validation, try/catch, `{ success, data, error }`.

| Action | Input | Success | Errors (`error.code`) |
| ------ | ----- | ------- | --------------------- |
| `createSurvey(values)` | `SurveyFormValues` | `{ id }`, then `revalidatePath("/dashboard")` and `redirect(/surveys/{id})` | `VALIDATION` (+ `fieldErrors`), `ACTIVE_LIMIT` |
| `updateSurvey(id, values)` | id + values | `{ id }`, `revalidatePath("/dashboard")` + `refresh()` | `NOT_FOUND`, `VALIDATION`, `ACTIVE_LIMIT`, `CATEGORY_LOCKED` |
| `deleteSurvey(id)` | id | soft delete, `revalidatePath("/dashboard")` + `redirect("/dashboard")` | `NOT_FOUND` |
| `setSurveyActive(id, active)` | id + boolean | only if the toggle saves immediately (see below) | `NOT_FOUND`, `ACTIVE_LIMIT` |

- **Errors are codes, not text.** The server cannot know the language (it lives in `localStorage`), so the client maps `error.code` to `t("surveyForm.errors.<code>")` and `fieldErrors` to `form.setError(path, { message: key })`. No locale needs to be sent.
- Organization and user come from `getAppContext()` (mock session) inside the action, never from the client.
- **Publish toggle**: part of the form and saved with "Save" (simpler, one source of truth). On create the switch is read-only: `createSurvey` publishes the new survey when the plan has a free active slot and saves it as a draft otherwise (no error; "created as a draft" toast). On edit the active-limit check runs when `isActive` goes from false to true, and on `ACTIVE_LIMIT` the toggle shows the error inline ("You already have 5 active surveys. Deactivate one first.") plus a toast.
- **Refreshing under Cache Components** (Next 16 docs):
  - `refresh()` (from `next/cache`, Server Actions only) refreshes the client router so the edit page shows the saved data;
  - `revalidatePath("/dashboard")` drops the dashboard from the router cache so the next visit shows the change;
  - `updateTag` is only for `'use cache'` data with tags, and the mock reads are uncached, so it is not needed until Prisma reads are cached;
  - `redirect()` throws, so call `revalidatePath` before it.
- **Calling the action**: from `form.handleSubmit` inside `startTransition`, with typed values (not `FormData`). `isPending` disables the save button and blocks double submits.

### Mock persistence until Prisma

- `src/lib/surveys/service.ts` (`import "server-only"`) owns a **mutable in-memory store**:
  - a `Map<string, Survey>` seeded from the mock seeds;
  - kept on `globalThis`, so it survives Fast Refresh, like the overview's Prisma client singleton.
- Functions mirror the future Prisma services one to one:
  - `listActiveSurveys(orgId)`, `getSurvey(orgId, id)`, `createSurvey(orgId, userId, input)`, `updateSurvey(orgId, id, input)`, `softDeleteSurvey(orgId, id)`;
  - `countActiveSurveys(orgId)`, `hasResponses(surveyId)` (counts `MOCK_RESPONSES`).
- `src/lib/dashboard.ts` and the `getMock*` helpers read surveys from this store instead of the `MOCK_SURVEYS` constant, so the dashboard shows new and edited surveys. Responses stay static: new surveys show 0 responses.
- Ids: `crypto.randomBytes(12).toString("hex")` (ObjectId format).
- Codes: 6 chars `A-Z0-9`, reject `SURVEY`, `PUBLIC`, `PANDA`, retry on collision (overview "Code generation").
- `createdAt` / `updatedAt` set by the service; `createdById` from the session.
- **Limits**: one server process, data resets on restart, and serverless deployments will not share it. Fine for development and demos; the store is replaced by Prisma without touching pages, actions or the form.

## 6. UX and behavior

| Behavior | Design |
| -------- | ------ |
| Back | "Back" goes to `/dashboard`. With `formState.isDirty` it opens `UnsavedChangesDialog` ("Discard changes?") |
| Leaving with unsaved changes | `beforeunload` listener while dirty (reload, tab close). Sidebar link clicks are not intercepted: App Router has no route-change events. Accepted for now |
| Delete (edit only) | `DeleteSurveyDialog` (`AlertDialog`): "Delete «{name}»? Its responses are kept and the link stops working." → `deleteSurvey` → toast + redirect |
| Save | Disabled while pending, spinner + label "Saving…", one submission at a time. Validation errors inline with focus on the first one (`shouldFocusError`, default in RHF), plus a toast "Check the highlighted fields" |
| Success | Create: toast "Survey created" + redirect to `/surveys/{id}` (the share panel with the QR is the next thing the user needs). Edit: toast "Changes saved", stays, form reset to the saved values (`reset(values)`) so `isDirty` is false |
| Counter | `OptionsCounter` badge per question: `{count}/{max} answers` (ICU plural) |
| Limit | Info `Alert` "Limit of 5 answers reached." and "Add answer" disabled when `count === max` |
| Add question | Dashed "Add question" button after the last question; appends the category template (Satisfaction: 5 default reactions; Rating: empty text; Poll: 2 empty options) and focuses its text input |
| Remove question | Trash button per question (disabled when it is the only one), with `aria-label` "Remove question 2" |
| Reorder | **Out of scope.** Responses reference ids, not positions, so reordering is safe to add later with up / down buttons (no drag-and-drop dependency) |
| Share panel (edit) | QR, link, code, open, copy, created at / by (below) |

### Share panel

- **QR**: `QRCode.create(publicUrl)` from `qrcode` is synchronous. Render its modules as an inline SVG in `useMemo`, with no effect and no state. "Download QR" calls `QRCode.toDataURL(publicUrl, { width: 1024, margin: 2 })` on click and downloads `panda-{code}.png`.
- **Public link and code**: read-only field and monospace box, each with the existing `CopyButton`. "Copy link" button as in the screenshot.
- **"Open survey"**: the kiosk route `/s` does not exist yet. Show the button disabled with a tooltip "Available when the kiosk is ready" until the kiosk feature, instead of opening a 404.
- **Created at / by**:
  - `format.dateTime(createdAt, { dateStyle: "medium", timeStyle: "short" })` in the active locale;
  - the creator's name and email from the user record (Ana López / Jordan Davis in the mock).

### Create vs. edit summary

| | Create (`/surveys/new`) | Edit (`/surveys/[id]`) |
| - | ---------------------- | ---------------------- |
| Title / subtitle | "New survey" / "Pick a category, write your questions and publish when ready." | "Edit survey" / "Update your survey's experience and answer options." |
| Default values | Empty name, inactive, no category, no questions | Stored survey (archived items excluded) |
| Category | Picker, free | Compact; locked when it has responses |
| Submit | "Create survey" → `createSurvey` → redirect to edit | "Save survey" → `updateSurvey` → stay |
| Delete | Hidden | Visible |
| Share panel | Hidden | Visible |

## 7. Layout, i18n and accessibility

- **Shell**: same `(app)` layout (sidebar + top bar).
  - The sidebar "Surveys" item stays disabled until the surveys list exists; no item is active on these pages.
  - "New survey" in the top bar keeps linking to `/surveys/new`.
- **Layout**: page `max-w-5xl` (a form reads better narrower than the dashboard), sections as `rounded-3xl` cards with `border-card-border`, gap between cards, header actions wrapping under the title below `sm`.
- **500px**: option rows stack (reaction select + color + face on one line, label input full width below), trash buttons stay 44px, share panel stacks (QR above the link).
- **Messages**:
  - new namespaces `surveyForm` (titles, sections, fields, buttons, dialogs, errors), `categories`, `validation`, `reactions` and `ratings` (default labels);
  - ICU plurals for counters ("{count}/{max} answers") and numbered labels ("Question {number}", "Option {number}");
  - both files keep the same keys (`yarn lint` checks it), and `react/jsx-no-literals` keeps literals out.
- **Accessibility**:
  - every input has a `FieldLabel` (`htmlFor`), with `aria-invalid` and `aria-describedby` to its `FieldError` / `FieldDescription`, and a required marker announced as text, not just an asterisk;
  - focus goes to the first invalid field on submit;
  - add / remove buttons have labels with the number ("Remove option 3 of question 2"), and new rows receive focus;
  - the `CategoryPicker` is a radio group;
  - the publish `Switch` is labelled by the "Publish survey" title and described by the helper text;
  - the color input has an `aria-label` ("Color for option 2"), and the face preview is `aria-hidden`;
  - both dialogs use `AlertDialog` (focus trap, Escape).

## 8. Phases

1. **Form shell and pages**:
   - install the packages and shadcn components;
   - `schema.ts`, the mock `service.ts` with its store, and `dashboard.ts` reading from it;
   - `createSurvey` / `updateSurvey`;
   - both pages with `notFound()`;
   - `SurveyForm` with `FORM_MODES`, the header, Details, `PublishToggle` (with the active limit) and `CategoryPicker`;
   - messages and the skeleton.
2. **Questions and options**: `QuestionsSection`, `QuestionEditor`, the three option editors, counter and limit alert, ids kept, archiving by omission in the service, duplicate-reaction check, default labels from messages.
3. **Share and delete**: `SharePanel` (QR SVG + PNG download, link, code, disabled "Open survey", created at / by), `deleteSurvey` + `DeleteSurveyDialog`, redirects and refresh.
4. **Polish**: unsaved-changes dialog and `beforeunload`, responsive pass at 500px, accessibility pass (focus, labels), dark mode check, browser verification in both languages.

## 9. Recommendation

- **Form**: build one `SurveyForm` Client Component with react-hook-form + a shared Zod 4 discriminated-union schema. The create / edit differences live in a single `FORM_MODES` table that picks copy keys, visible sections and the Server Action; children never read `mode`.
- **Pages**: keep them as Server Components that load and map data (edit inside `<Suspense>` because `params` is runtime data) and call `notFound()` for anything outside the organization.
- **Category**: it drives the options. Drop the per-option "Tipo" select, and enforce 1–5 unique reactions, generated ratings and 2–5 poll options in both the form and the action.
- **Saving**:
  - Server Actions return error codes that the client translates;
  - `refresh()` / `revalidatePath` / `redirect` keep pages fresh under Cache Components;
  - removed items are archived by omission in the service, which matches the overview.
- **Persistence**: a `globalThis` in-memory store behind `src/lib/surveys/service.ts` until Prisma, with the same function signatures the Prisma services will have.

Ship it in the four phases above. The schema requires at least one question, so:

- **After phase 1**, edit already works for name, description, category and publish state: the stored questions travel unchanged in the form values.
- **Creating a survey end to end** works from phase 2.
