# Global Search / Command Palette Spec

## Overview

A command palette for the admin app, opened with **⌘K** (Mac) / **Ctrl K** (Windows, Linux) or from a search button in the top bar (the "Search surveys… ⌘K" box in the overview's navigation sketch, section 9).

One input that does three jobs:

- **Find**: surveys in the active organization (by name or 6-character code) and people in it (by name, email or phone).
- **Go to**: every admin page (Dashboard, Surveys, Users, Invitations, My profile, Plan).
- **Do**: the frequent actions (New survey, Invite user, switch organization, theme, language, open the kiosk, sign out).

Requires the Prisma services, auth and subscriptions (memberships, roles, plans). Nothing in the data model changes; no migration.

## Decisions

- **Surveys and people are searched in Postgres, not on the client.** The template idea of pre-fetching everything on app load does not fit here: an organization can hold any number of draft surveys, the admin shell is a static frame with the user data in Suspense (pre-fetching would add a query to every page), and the accent- / case-insensitive search already exists (`f_unaccent`, `containsPattern`, `digitsPattern` in `src/server/search.ts`, used by `src/lib/surveys/list.ts` and `src/lib/users/list.ts`). One debounced Server Action returns a few results per group, cached per organization with the existing tags, so it stays fresh after any survey or user action without new invalidation code.
- **Pages and actions are filtered on the client**, instantly, with one small matcher (`src/lib/search/match.ts`) that ignores accents and case and ranks word-prefix matches first. cmdk runs with `shouldFilter={false}` so both halves use our order, not cmdk's.
- **No typo tolerance** for surveys and people (contains match, like the tables). Real fuzzy matching would need `pg_trgm` and a migration; not worth it until someone asks.
- **Scoped like everything else**: only the active organization (`panda-org`), only non-deleted surveys, only that organization's memberships. Results come from the session context, never from ids sent by the client.
- **Same destinations as the lists**: a result opens what clicking its row in the table opens, so permissions stay in one place (`canManageUsers`, own row → `/profile`).
- **No new top-level route.** "See all results" hands the query to the existing `/surveys?q=` and `/users?q=` searches.

## Requirements

### Opening and closing

- `⌘K` / `Ctrl K` toggles the palette on every page of the `(app)` layout (dashboard, surveys, users, invitations, profile, settings), including `/profile` and `/settings/plan` without an organization. It calls `preventDefault` (Firefox and Chrome use Ctrl K for the address bar).
- The shortcut is ignored while another modal is open (alert dialogs, unsaved changes dialog, invite dialog), so it never stacks dialogs.
- Escape, clicking outside or picking a result closes it; focus returns to whatever opened it (the top bar button or the previously focused element).
- Not on the landing, the kiosk (`/s`), `/sign-in`, `/register` or `/welcome`: they have no admin shell.

### Top bar trigger (`AppTopBar`)

- A `SearchButton` before the organization switcher: looks like an input ("Search…" + `<kbd>` hint) when the bar has room (`@3xl`), an icon button with the label in `aria-label` and a tooltip below that.
- The hint shows `⌘K` on Apple platforms and `Ctrl K` elsewhere, decided after mount (`navigator.userAgentData?.platform ?? navigator.platform`); the `<kbd>` renders nothing until then, so there is no hydration mismatch.
- Forms that hide the switchers when narrow (`hideSwitchersWhenNarrow`) hide the search button with them.

### Palette layout (`src/components/search/CommandPalette.tsx`)

shadcn `command` (cmdk) inside its `CommandDialog`, with a translated sr-only title and description.

- **Empty query**: *Recent surveys* (the 5 most recently updated), *Go to*, *Actions*.
- **With a query**: *Surveys*, *People*, *Go to*, *Actions*; empty groups are hidden. Each search group ends with "See all N results" when there are more than 5.
- **Nothing found**: "No results for "{query}"" plus a "New survey named "{query}"" action (only with an organization), which opens `/surveys/new?name=` with the name prefilled.
- Keyboard: ↑ / ↓ move, Enter picks, Home / End jump; mouse hover moves the selection (cmdk defaults). The result count is announced in a polite live region.
- While the server search is in flight, the previous results stay and a `CommandLoading` row shows in the search groups (no layout jump); errors show "Search is unavailable right now" in those groups and leave Go to / Actions working.

### Result rows

| Group | Row | On select |
| --- | --- | --- |
| Surveys | survey color dot, name (matched part highlighted), code, category icon (face / star / list), Active or Draft pill | `/surveys/[id]` |
| People | avatar (image or initials), name + "You" badge, email, role badge, Inactive pill when deactivated | same as the user row: `/users/[id]` for owner / admin, `/profile` for yourself; members (read-only `/users`) get `/users?q=<email>` |
| Go to | icon + page name (+ pending count on Invitations) | the route |
| Actions | icon + label | see below |

The current page is marked in Go to ("Current page" pill) and still selectable.

### Actions

| Action | Shown when | Does |
| --- | --- | --- |
| New survey | has an organization | `/surveys/new` |
| Invite user | owner / admin, organization on Pro (same rule as `InviteUserButton`) | `/users?invite=1`, which opens the invite dialog once and removes the param; when every place is taken it shows the existing "Every place is taken…" message as a toast instead |
| Switch to {organization} | one item per other active membership | `switchOrganization` (existing action), toast on error |
| Create organization | owns none | `/welcome` |
| Dark mode / Light mode | always (the one not active) | `setTheme` |
| English / Español | always (the one not active) | the existing locale setter |
| Open kiosk | has an organization | `/s` in a new tab |
| Sign out | always | the existing sign-out action |

### Server search

- `searchWorkspace(query)` in `src/actions/search.ts`: Zod (`string`, trimmed, 1–100 chars, longer input cut); session via `getSessionAppContext` (signed out → `UNAUTHENTICATED`, no organization → empty groups); rate limit 60 calls per user per minute (`createRateLimiter`, `RATE_LIMITED` → the unavailable message). Returns plain data, no `Date` objects.
- `searchOrganization(organizationId, currentUserId, query)` in `src/lib/search/service.ts`, `"use cache"` with `surveysTag(organizationId)` and `usersTag(organizationId)`, `cacheLife("minutes")`. Two `$queryRaw` in parallel, bound parameters only:
  - **Surveys**: `organizationId`, `deletedAt IS NULL`, `f_unaccent(lower(name)) LIKE f_unaccent(lower($pattern)) ESCAPE '\'` or `code ILIKE $pattern`. Order: exact code first, then name starting with the query, then the rest, then `updatedAt DESC`. `LIMIT 5`, total with `COUNT(*) OVER()`. Fields: id, name, code, category, isActive, colorIndex.
  - **People**: the organization's memberships joined to users (same rows `/users` lists), matching name or email (unaccent) or phone digits (`digitsPattern`, only for queries without letters, so "store7" never matches phones with a 7; fixed for `/users` too). Order: you last, then name starting with the query, then `und-x-icu` name order. `LIMIT 5` + total. Public columns only (never `passwordHash`).
- Empty query (Recent surveys): the same function with no filter, ordered by `updatedAt DESC`, surveys only.
- Client: 200 ms debounce, only the latest response is applied (ignore out-of-order replies), nothing is sent for a blank query after the first Recent fetch.

### Client matcher (`src/lib/search/match.ts`)

- `normalize(text)`: NFD, strip combining marks, lowercase, collapse spaces.
- `matchScore(label, query, keywords?)`: 0 for no match; higher for a match at the start of the label, then at the start of a word, then anywhere; every query word must match (label or keywords). Used for Go to and Actions, with keywords in both languages ("settings", "configuración", "billing" → Plan; "theme", "tema" → Dark mode).

### Messages

`search.*` in en and es: trigger label and placeholder, dialog title / description, group headings, "See all {count} results" (ICU plural), "Current page", "No results for …", "New survey named …", unavailable message, live region count; action labels reuse existing keys where they exist (`userMenu`, `nav`, `organizations`). The message parity check in `yarn lint` must pass.

## Out of scope

- Searching questions, answer options or response data; a survey's metrics page (`/surveys/[id]/metrics` does not exist yet).
- Row actions inside the palette (copy link, activate, delete). Enter opens the row; the row menu stays the place for those.
- Typo-tolerant search (`pg_trgm`), recent searches history, searching across every organization at once.

## Verification

- `yarn test`: unit tests for `normalize` / `matchScore` (accents, case, word prefix beats contains, multi-word, keywords in es) and the action's input schema.
- As Jordan (Acme, Pro owner): ⌘K on Mac and Ctrl K on another OS open and close it; "store7" and "STORE7" find STORE7 first by code; "satisfaccion" finds "Satisfacción…"; "lucia" finds Lucía; "5512" finds her by phone; "%" and "_" match literally; "See all" opens `/surveys?q=` / `/users?q=` with the query; New survey, Invite user (dialog opens), theme, language and sign out work.
- As Marco (member of Acme): Acme results only; picking a person goes to `/users?q=`. Switching organizations from the palette needs a user with two memberships (none in the seed).
- As Nora (no organization) on `/profile`: no search groups, Create organization present, no New survey.
- Freshness: create, rename and delete a survey, then reopen: the results follow right away (tags expired by the existing actions).
- No `passwordHash` in the action's response; ids from other organizations never appear; 61st call in a minute → unavailable message.
- Keyboard only and screen reader names (dialog title, live count, option names); focus back to the trigger; ⌘K ignored while a confirmation dialog is open.
- 375 / 768 / 1280, light and dark, English and Spanish: no overflow, the button collapses to its icon on narrow bars and on narrow form bars.
