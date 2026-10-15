# Contextual Top Bar

The admin top bar becomes the page header: on the dashboard it keeps the date and greeting, and on every other view it shows that view's title (`h1`), its subtitle and its main action.

## 1. Current state

| Piece | Today |
| --- | --- |
| `src/app/(app)/layout.tsx` | Renders `TopBar` above `{children}` for every admin route, with `user`, `organizations` and `currentOrganizationId` from `getAppContext()` |
| `TopBar` | Sticky `@container` header, 80px: mobile `SidebarTrigger`, `Greeting` (date + "Good afternoon, Jordan"), then `OrganizationSwitcher`, `LanguageSwitcher`, `NewSurveyButton`. Labels hide when the bar is narrow (`@3xl`) |
| Dashboard | sr-only `h1` (`DashboardTitle`); the greeting is plain text |
| `/surveys` | `SurveysTableSection` renders `h1` "All surveys" + count, subtitle and the date range select above the table |
| `/surveys/new`, `/surveys/[id]` | `SurveyForm` renders `FormHeader` (h1, subtitle, Back, Delete in edit, Submit) inside the `<form>`; the edit page is inside Suspense |
| `/users` | `UsersTableSection` renders `h1` "Users" + count, subtitle and "New user" |
| `/users/new`, `/users/[id]`, `/profile` | `UserForm` renders `FormHeader` (h1, subtitle, Back, Submit) |

So every non-dashboard page shows two headers: the greeting bar and the page heading right under it, with "New survey" visible even while creating or editing a survey.

## 2. Target, per view

| View | Left side (heading) | Right side (actions) | Removed from the content |
| --- | --- | --- | --- |
| Dashboard | Date + greeting (as today) | Organization, language, **New survey** | — (no change) |
| Surveys list | **h1 "All surveys"** + muted count, subtitle "Manage your surveys…" | Organization, language, **New survey** | Heading block; the range select moves into the table toolbar |
| Create survey | Back arrow + **h1 "Create survey"**, subtitle | Organization, language, **Create survey** (submit) | `FormHeader` |
| Edit survey | Back arrow + **h1 "Edit survey"**, subtitle | Organization, language, Delete (icon, destructive), **Save changes** (submit) | `FormHeader` |
| Users list | **h1 "Users"** + count, subtitle | Organization, language, **New user** | Heading block |
| Create / edit user | Back arrow + **h1 "New user" / "Edit user"**, subtitle | Organization, language, **Create user** / **Save changes** | `FormHeader` |
| My profile | Back arrow + **h1 "My profile"**, subtitle | Organization, language, **Save changes** | `FormHeader` |

Rules behind the table:

- **The left side is the page's `h1`** on every view except the dashboard (which keeps its greeting and its sr-only `h1`). Exactly one `h1` per page.
- **The right side ends with the view's primary action**: "New survey" where creating a survey is the next step (dashboard, survey list), the form's submit button on forms, "New user" on the user list. Organization and language switchers stay on every view.
- **Back** becomes an icon button (`ArrowLeftIcon`, label "Back") before the title, as in most admin apps, instead of a text button next to Submit. It keeps today's behavior (unsaved changes dialog).
- **Delete** (edit survey only) becomes an icon button with tooltip and destructive styling next to Save, so the bar keeps one strong primary button.
- **Titles**: today the create title is "New survey" / "Nueva encuesta". The request asks for "Create survey" / "Crear encuesta". That makes the title and the submit button the same text. Recommendation: title "Create survey", subtitle unchanged, submit "Create survey" (same verb is normal in admin forms; the bar shows the button with an icon, so they read as title vs action). Same for users ("Create user").

## 3. How a page provides its top bar

Options:

| Option | How | Problem |
| --- | --- | --- |
| Layout slot (parallel route `@topbar`) | `(app)/@topbar/surveys/page.tsx`, etc. | The bar is a separate tree: the form's submit button and pending state cannot reach it; duplicate route files for every page |
| Portal from the page into the bar | Page renders `<TopBarPortal>` into a node in the layout | Portals do not render on the server: the bar is empty until hydration (flicker, layout shift); breaks the static shell |
| Context set by the page | Page writes title / actions into a context the layout reads | Same first-paint problem, and actions are functions / elements in shared state |
| **Each page renders the bar itself** | Layout renders the sidebar and `SidebarInset`; every page starts with `<AppTopBar …>` | Repeated in each page, but explicit, server rendered, and the bar can live inside the form |

**Recommendation: each page renders the top bar.** It is the only option that renders the right title on the server (no flash), keeps the static shell, and lets a form put its submit button in the bar as a real `type="submit"` inside the `<form>`.

### Shared pieces

- **`AppTopBar`** (`src/components/layout/AppTopBar.tsx`, client): the sticky `@container` header with the mobile `SidebarTrigger`, a `heading` slot (left), and an `actions` slot (right) placed after the global controls. It reads the global data from context (below).
- **`PageHeading`**: the left side for non-dashboard views: optional back button, `h1` (`text-xl @3xl:text-2xl`, truncated), optional count, subtitle (`text-sm text-muted-foreground`, truncated, hidden below `@md`).
- **`AppShellProvider`** (client context) in `(app)/layout.tsx`: `user`, `organizations`, `currentOrganizationId`. The layout keeps getting them from `getAppContext()` and no longer renders `TopBar`; `AppTopBar` reads them, so pages do not pass them around.
- `Greeting` + `NewSurveyButton` stay as they are; the dashboard passes them to `AppTopBar`.

### Page layout

```tsx
// /surveys (server page)
<>
  <SurveysTopBar />                 {/* static: title, subtitle, New survey */}
  <div className="mx-auto max-w-7xl …">
    <Suspense fallback={<SurveysTableSkeleton />}>…</Suspense>
  </div>
</>
```

- The bar goes **before** the page's `max-w` container, so it spans the main column as today, and **outside Suspense** where its content does not depend on runtime data (dashboard, lists, create forms): it is part of the static shell and never flickers.
- The list **count** is the total before filters, which does not depend on the URL: the page computes it outside Suspense and passes it to the bar, so it is part of the static shell (no nested Suspense needed; mutations revalidate the page). It sits next to the `h1`, not inside it, and hides on narrow bars (below `@md`) where the title needs the room. *(Decided in phase 1.)*

### Forms

```tsx
<FormProvider {...form}>
  <form onSubmit={…} noValidate>
    <AppTopBar
      heading={<PageHeading back={goBack} title={…} subtitle={…} />}
      actions={<>{onDelete && <DeleteIconButton …/>}<SubmitButton pending={isPending} label={…} /></>}
    />
    <div className="mx-auto max-w-5xl …">{sections}</div>
  </form>
</FormProvider>
```

- The bar is **inside the `<form>`**, so the submit button is a plain `type="submit"`: Enter in a field still submits, pending state comes from the form component, no `form="…"` attribute or global state needed.
- Sticky still works: the form is the bar's containing block and spans the whole page.
- **Edit pages** load inside Suspense (`params`). Their fallback renders the same `AppTopBar` with the static title and a **disabled** submit button, then the form skeleton, so the bar looks identical while the data streams.
- `FormHeader` is removed (both forms use the bar). `UnsavedChangesDialog`, `beforeunload` and the delete dialog stay in the forms.

## 4. Content changes

- **Surveys list**: remove the heading block from `SurveysTableSection`. The date range select moves into the table toolbar (right side, before Type and Status), with its calendar icon; on narrow cards it takes a full row like the other filters. The skeleton loses the heading bars and gains the range block in the toolbar.
- **Users list**: remove the heading block from `UsersTableSection`; "New user" moves to the bar.
- **Forms**: remove `FormHeader`; the first card starts right under the bar.
- **Dashboard**: no change (its sections keep their own `h2`s).
- Page top padding (`py-8 md:py-10`) stays, so the first block keeps its distance from the bar.

## 5. Responsive

The bar is already a container; the new heading follows the same rules:

| Bar width | Heading | Actions |
| --- | --- | --- |
| ≥ `@3xl` (48rem) | Title `text-2xl` + subtitle | Labels on all buttons |
| `@md` – `@3xl` | Title `text-xl` + subtitle (truncated) | Organization and language as icons; primary action keeps its label |
| < `@md` (phones) | Title only (truncated), subtitle hidden | Organization and language as icons; primary action as icon with `aria-label` and tooltip; Delete as icon |

- Title truncates with `title` attribute; the back arrow and sidebar trigger never shrink.
- On phones the form submit stays reachable at the top (sticky bar). A bottom sticky save bar is not needed.
- Check 375 / 768 / 1024 / 1280 with the sidebar open and collapsed: the longest Spanish titles ("Editar encuesta", "Todas las encuestas") with the three controls.

## 6. Accessibility

- One `h1` per page, now in the bar (`<header>` is a banner landmark inside `main`'s column; keep it a plain `header` element). The dashboard keeps its sr-only `h1` and the greeting stays a paragraph.
- Icon buttons (Back, Delete, collapsed primary actions) have `aria-label` and a tooltip with the same text.
- The submit button announces its pending state ("Saving…") as today.
- Focus order: sidebar trigger → back → (heading text) → organization → language → actions → page content. Tab from the bar reaches the first field.
- Skip link (landing has one; the admin does not): consider adding "Skip to content" to `AppTopBar`, since the bar now holds several controls before the content.

## 7. i18n

No new strings except:

- `form.actions.back` is reused as the back button label;
- `surveyForm.createTitle` → "Create survey" / "Crear encuesta" and `userForm.createTitle` → "Create user" / "Crear usuario" (if the title change is accepted);
- a short "Delete survey" label for the icon button (`surveyForm.actions.deleteSurvey`).

Titles and subtitles come from the existing keys (`surveys.title`, `surveys.subtitle`, `surveyForm.*Title/*Subtitle`, `users.title`, `userForm.*`, `profile.*`).

## 8. Overview rule

Added to `context/project-overview.md` (section 9, UI/UX) so new views follow it:

- The admin top bar is the page header. Every admin page renders `AppTopBar` first, outside its `max-w` container and outside Suspense when its title does not depend on data.
- Left: the dashboard shows date + greeting; every other view shows its `h1`, optional count and subtitle (`PageHeading`), with a back button on detail and form pages.
- Right: organization and language switchers, then the view's primary action (one strong button): "New survey" on the dashboard and survey list, the entity's "New …" on other lists, the submit button on forms.
- Pages do not render a second heading in their content.

## 9. Files

| Action | Files |
| --- | --- |
| New | `src/components/layout/AppTopBar.tsx`, `PageHeading.tsx`, `AppShellProvider.tsx`, `TopBarActions` helpers (`SubmitButton`, `DeleteIconButton`) |
| Change | `(app)/layout.tsx` (provider, no `TopBar`), dashboard page (renders `AppTopBar` with `Greeting` + `NewSurveyButton`), surveys pages, `SurveysTableSection` / toolbar / skeleton (range select), `SurveyForm`, `SurveyFormSkeleton`, users pages, `UsersTableSection`, `UserForm`, `UserFormSkeleton`, profile page, messages |
| Remove | `TopBar.tsx` (replaced), `FormHeader.tsx` |

## 10. Verification

- `yarn lint`, `tsc --noEmit`, `yarn build`: the route table keeps the same static / partial prerender kinds (the bar is part of the static shell).
- Each view shows the expected heading and actions (section 2) in English and Spanish, light and dark.
- No flicker of the bar on load and on client navigation between views (the edit pages show the same bar in their fallback).
- Forms: Enter submits; the bar button shows the pending state; Back opens the unsaved changes dialog when dirty; Delete opens its dialog; after creating a survey the bar switches to "Edit survey".
- Surveys list: the range select works from the toolbar and keeps its URL param.
- 375 / 768 / 1024 / 1280 with the sidebar open and collapsed: no overflow, titles truncate, icon buttons named.
- One `h1` per page (axe or a quick `document.querySelectorAll("h1").length` check).

## 11. Recommendation

Three phases:

1. **Bar infrastructure + lists**: `AppShellProvider`, `AppTopBar`, `PageHeading`; dashboard moved to it with no visible change; surveys list and users list headings moved into the bar (range select into the toolbar); overview rule.
2. **Survey form**: `SurveyForm` renders the bar inside the `<form>` (back, delete icon, submit), `FormHeader` removed from it, edit fallback with the static bar; create title "Create survey".
3. **User forms and profile**: `UserForm` on the bar (create, edit, profile), `FormHeader` deleted, user create title "Create user".

Decisions to confirm:

- Create titles become "Create survey" / "Create user" (same text as the submit button), or keep "New survey" / "New user".
- Back as an icon before the title, and Delete as an icon button in the bar.
- The range select moves into the survey table toolbar.
- The users views follow the same pattern (the request names only the survey views).
