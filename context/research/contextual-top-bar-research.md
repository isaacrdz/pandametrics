# Contextual Top Bar

## Output

`docs/contextual-top-bar.md`

## Research

Document how to make the admin top bar change with the view:

- **Dashboard**: unchanged (date + "Good afternoon, Jordan", organization switcher, language switcher, "New survey").
- **Survey list**: the date and greeting are replaced by the page's `h1` "All surveys" and its subtitle; "New survey" stays.
- **Create / edit survey**: the top bar says "Create survey" / "Edit survey" with the page subtitle, and "New survey" is replaced by the form's submit button ("Create survey" / "Save changes").
- In every view other than the dashboard, the left side of the top bar shows the view's `h1` and the text under it, instead of the date and greeting.

Also apply the same pattern to the user views (list, create, edit, profile) and write it into `context/project-overview.md` as the rule for new views.

The result must be detailed enough to split the work into phased feature specs.

## Include

Current state:

- `src/app/(app)/layout.tsx` renders `TopBar` (sidebar trigger, `Greeting`, `OrganizationSwitcher`, `LanguageSwitcher`, `NewSurveyButton`) for every admin page; the bar is a sticky `@container` with labels that hide when narrow.
- Each page renders its own heading in the content: `SurveysTableSection` (h1 + count + subtitle + range select), `FormHeader` in `SurveyForm` and `UserForm` (h1 + subtitle + Back, Delete, Submit), `UsersTableSection` (h1 + count + subtitle + "New user"), the dashboard's sr-only `DashboardTitle`.
- Translated text lives in Client Components; Cache Components with static shells and Suspense for runtime data (`searchParams`, `params`).
- Form state (`isPending`, `isDirty`) lives inside `SurveyForm` / `UserForm`; the edit forms render inside Suspense.

What to define:

- How a page provides its top bar content (options: layout slot via parallel routes, portal, context, the page rendering the bar itself) and which one fits Cache Components, translations and form state.
- Where global data for the bar (user, organizations) comes from if the layout no longer renders it.
- Per view: left side (title, subtitle, count), right side (global controls + view actions), what moves out of the content (headings, Back, Delete, range select).
- How the submit button in the bar talks to the form (inside the `<form>`, `form` attribute, pending state, disabled while loading).
- Loading states: the bar must not flicker or disappear while the content streams.
- Responsive (labels that collapse, subtitle on narrow bars, mobile sidebar trigger), accessibility (one `h1`, landmarks, button names), i18n.
- Overview rule for new views.
- Phases.

## Sources

- @src/app/(app)/layout.tsx
- @src/components/layout/TopBar.tsx
- @src/components/layout/Greeting.tsx
- @src/components/layout/NewSurveyButton.tsx
- @src/components/form/FormHeader.tsx
- @src/components/surveys/form/SurveyForm.tsx
- @src/components/surveys/table/SurveysTableSection.tsx
- @src/components/users/form/UserForm.tsx
- @src/components/users/table/UsersTableSection.tsx
- @src/app/(app)/
- @context/project-overview.md
