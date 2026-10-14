# Survey Form Spec

## Overview

Build the create (`/surveys/new`) and edit (`/surveys/[id]`) views from the form screenshots. **Both pages reuse one `SurveyForm` component.** Only these things change between them:

- the title and subtitle;
- the default values;
- the submit action (create vs. update);
- the available actions and sections (delete, share panel, category lock).

Data is persisted in an in-memory store behind the same functions the Prisma services will have. Full research in `docs/survey-form.md`.

The work is split in 4 phases. Each phase can be loaded as its own feature or implemented in order within this one. Creating a survey end to end works from phase 2, because a survey needs at least one question.

## Decisions (from the research)

- **One form, two pages**:
  - Both pages are Server Components. They pass `mode`, form values and `meta` (id, code, publicUrl, createdAt, createdBy, hasResponses).
  - A single client-side `FORM_MODES` table picks the copy keys, the visible sections and the Server Action.
  - Children never read `mode`.
- **Category drives the options**:
  - The per-option "Tipo" select from the screenshots is removed.
  - Satisfaction: 1–5 unique reactions with editable label and color.
  - Rating: question text only (5 stars generated).
  - Poll: 2–5 text options (images come with the uploads feature).
- **Category lock**: free in create, locked in edit when the survey has responses (also enforced by the server)
- **Shared Zod 4 schema**:
  - Used by react-hook-form and by the Server Actions. As implemented: one question / option shape with the per-category rules in `.check()`, because a discriminated union of field arrays does not bind well with react-hook-form.
  - Error messages are message keys, translated on the client.
- **Server Actions return error codes** (`VALIDATION`, `ACTIVE_LIMIT`, `NOT_FOUND`, `CATEGORY_LOCKED`), never text. The language lives in `localStorage`.
- **Archiving by omission**: the form drops removed rows; the service merges by `id` and sets `archivedAt` on stored items missing from the payload
- **Publish toggle is saved with "Save"**; the 5-active limit is checked on create / update
- **After save** (as implemented: the actions return a result and the client navigates, so the success toast can show):
  - create → `revalidatePath("/dashboard")`, the action returns the id and the client goes to `/surveys/{id}`;
  - edit → `revalidatePath("/dashboard")` + `refresh()`, staying on the page and resetting the form to the saved values;
  - delete → soft delete + `revalidatePath("/dashboard")`, the client goes to `/dashboard`.
- **Out of scope**: reordering questions or options, poll image upload, the kiosk route (`/s`), the surveys list page
- **Copy**: all in `src/messages/{en,es}.json`; English stays the default

## Phase 1: Form shell, pages and persistence

- Install `react-hook-form`, `zod`, `@hookform/resolvers`, `qrcode`, `@types/qrcode`, `server-only`
- Add shadcn components: `field`, `label`, `textarea`, `switch`, `alert`, `alert-dialog`, `radio-group`
- `src/lib/surveys/schema.ts`:
  - `surveyFormSchema` (per-category rules in `.check()`) and `SurveyFormValues`;
  - limits: name 120, description 500, question 300, reaction label 40, poll label 80;
  - error keys: `required`, `tooLong`, `minQuestions`, `minOptions`, `maxOptions`, `duplicateReaction`, `categoryRequired`.
- `src/lib/surveys/service.ts` (`import "server-only"`):
  - **Store**: a mutable `Map<string, Survey>` on `globalThis`, seeded from the mock surveys.
  - **Functions**: `listActiveSurveys`, `getSurvey(orgId, id)` (excludes soft-deleted and other organizations), `createSurvey`, `updateSurvey`, `softDeleteSurvey`, `countActiveSurveys`, `hasResponses`.
  - **Ids**: ObjectId-like (`crypto.randomBytes(12)`).
  - **Codes**: 6-char `A-Z0-9`, rejecting `SURVEY` / `PUBLIC` / `PANDA` and retrying on collision.
  - **Timestamps**: `createdAt` / `updatedAt`.
  - **Merge by `id`**: existing items are updated, new items get ids, stored items missing from the payload are archived.
  - **Option changes with answers**: changing a reaction value on an option that has answers archives it and creates a new option. Relabeling (reaction or poll) updates in place: a poll option's value is fixed at creation.
  - **Rating**: options are generated.
- `src/lib/surveys/form-values.ts`: `toFormValues(survey)` (archived items excluded), `EMPTY_SURVEY_VALUES`, category templates
- `src/lib/dashboard.ts` and the `getMock*` helpers read surveys from the store instead of the `MOCK_SURVEYS` constant (new surveys show 0 responses)
- `src/actions/surveys.ts` (`'use server'`):
  - `createSurvey(values)` and `updateSurvey(id, values)`;
  - Zod validation, try/catch, `{ success, data, error: { code, fieldErrors? } }`;
  - organization and user from `getAppContext()`;
  - 5-active limit (`ACTIVE_LIMIT`) and category lock (`CATEGORY_LOCKED`).
- Pages:
  - `src/app/(app)/surveys/new/page.tsx`: static, `<SurveyForm mode="create" … />`.
  - `src/app/(app)/surveys/[id]/page.tsx`: not async. An inner async component awaits `params` inside `<Suspense fallback={<SurveyFormSkeleton />}>`, loads the survey and calls `notFound()` when it is missing, deleted or from another organization.
  - `[id]/loading.tsx`.
- `src/components/surveys/form/` (all client):
  - `SurveyForm`: `FormProvider`, `useTransition`, submit through `FORM_MODES`, maps error codes to toasts and `fieldErrors` to `setError`, resets to the saved values after edit.
  - `form-modes.ts`.
  - `SurveyFormHeader`: title, subtitle, Back, Delete (edit only, wired in phase 3), Save with pending state.
  - `FormSection`: numbered tile, title, subtitle, card.
  - `SurveyDetailsSection`: name (required), description.
  - `PublishToggle`: `Switch`, "Active" badge, green tint, inline `ACTIVE_LIMIT` error.
  - `CategoryPicker`: `RadioGroup` of 3 cards with face / star / poll previews; compact and locked with an info `Alert` in edit when `hasResponses`; confirm before changing category in create when questions have content.
  - `SurveyFormSkeleton`.
- Messages: namespaces `surveyForm` (titles, sections, fields, buttons, errors, toasts), `categories`, `validation`
- Back: goes to `/dashboard`

## Phase 2: Questions and per-category options

- `QuestionsSection`:
  - `useFieldArray("questions", { keyName: "fieldKey" })` so the stored `id` is kept;
  - "Add question" (dashed) appends the category template and focuses its text;
  - remove is disabled when there is only one question.
- `QuestionEditor`: "Question {number}" (required) and a remove button labelled with the number
- `ReactionOptionsEditor`:
  - Each row has a reaction `Select` listing only unused values, a color bar (native color input with `aria-label`), the `ReactionFace` preview, the label input and a remove button.
  - "Add answer" appends the first unused reaction with its default label and color.
- `RatingOptionsPreview`: read-only 1–5 stars
- `PollOptionsEditor`: 2–5 rows with label input and remove; default colors from the poll fallback palette
- `OptionsCounter`: "{count}/{max} answers" badge (ICU plural); info `Alert` "Limit of 5 answers reached."; "Add answer" disabled at the limit
- Duplicate reactions reported on the row through the schema's `.check()`
- Default labels for new reaction and rating options from the active locale (`reactions.*`, `ratings.*` messages), stored with the survey
- Messages: `reactions`, `ratings`, question / option labels and counters

## Phase 3: Share panel and delete

- `SharePanel` (edit only):
  - **QR**: `QrCode` renders an inline SVG from `QRCode.create(publicUrl)` (synchronous, `useMemo`); "Download QR" calls `QRCode.toDataURL(publicUrl, { width: 1024, margin: 2 })` on click and saves `panda-{code}.png`.
  - **Link and code**: public link read-only field and code box, each with `CopyButton`, plus "Copy link".
  - **"Open survey"**: disabled with a tooltip until the kiosk exists.
  - **Created at / by**: `format.dateTime(createdAt, { dateStyle: "medium", timeStyle: "short" })`, and the creator's name and email.
- `deleteSurvey(id)` action: soft delete, `revalidatePath("/dashboard")`, `redirect("/dashboard")`; `NOT_FOUND` when missing
- `DeleteSurveyDialog` (`AlertDialog`): "Delete «{name}»? Its responses are kept and the link stops working.", then a toast

## Phase 4: Unsaved changes, responsive and accessibility

- `UnsavedChangesDialog` (`AlertDialog`) when "Back" is clicked with `formState.isDirty`; `beforeunload` listener while dirty
- Responsive at 500px:
  - header actions wrap under the title;
  - option rows stack (reaction, color and face on one line, label below);
  - the share panel stacks;
  - touch targets are 44px.
- Accessibility:
  - labels tied to inputs, with `aria-invalid` and `aria-describedby` to errors and descriptions;
  - the required marker is announced as text;
  - focus goes to the first error on submit and to new rows when added;
  - add / remove buttons are labelled with numbers ("Remove option 3 of question 2");
  - the publish `Switch` has a label and a description;
  - the face preview is `aria-hidden`.
- Dark mode check of the section cards, publish card and share panel

## Verification

- `yarn lint` (with the message key check), `tsc` and `yarn build` pass; no `blocking-route` warnings in dev
- `/surveys/new`:
  - empty form, no category selected, no Delete or Share;
  - submitting empty shows translated errors inline with focus on the first one;
  - creating a Satisfaction, Rating and Poll survey redirects to its edit page with a toast;
  - the new survey appears on the dashboard (0 responses) when active.
- `/surveys/[id]` for PROD91:
  - loads the stored values;
  - category locked (it has responses);
  - editing the name and saving shows "Changes saved", stays on the page and the dashboard shows the new name.
- Removing an option that has answers and saving: the dashboard card still shows its answers marked "(removed)"
- Activating a sixth survey fails with the active-limit error inline and as a toast
- Unknown id, deleted survey or another organization's id → 404
- Satisfaction: no duplicate reactions, max 5 options, "Add answer" disabled at 5 with the limit alert; Poll: min 2, max 5
- QR scans to `PANDA_PUBLIC_URL/s?code=CODE`; "Download QR" saves a PNG; link and code copy with a toast
- Delete asks for confirmation, soft-deletes, redirects to the dashboard and the survey disappears from it
- "Back" with unsaved changes asks to discard; reload with unsaved changes warns
- Everything works in English and Spanish, at desktop and 500px, and in dark mode

## References

- @docs/survey-form.md
- @context/project-overview.md
- @context/coding-standars.md
- @src/types/survey.ts
- @src/lib/mock-data.ts
- @src/lib/dashboard.ts
- @src/components/dashboard/CopyButton.tsx
- @src/components/surveys/ReactionFace.tsx
- @src/components/surveys/StarRow.tsx
- @src/i18n/LocaleProvider.tsx
- @src/messages/en.json

- @context/screenshots/form-create-edit-1.png
- @context/screenshots/form-create-edit-2-1.png
- @context/screenshots/form-create-edit-2-2.png
- @context/screenshots/form-create-edit-3.png
