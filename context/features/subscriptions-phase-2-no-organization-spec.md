# Subscriptions Phase 2 — Registration Without an Organization

## Overview

Phase 2 of 6 of plans and organizations. Signing up no longer creates an organization. A signed-in user without one lands on a new `/welcome` page, where they create their own organization. That is the only one they can ever own. Survey creation is rejected without an active organization, on every plan.

Pending invitations on `/welcome` come in phase 4. Full research: `docs/subscriptions.md` (sections 5 and 7.1).

## Decisions (from the research)

- **A new account has no organization and no plan.** This applies to email registration and Google sign-up alike. `createUserWithOrganization` is deleted.
- **Any user who does not own an organization can create one, at any time.** They get `OWNER_LIMIT` if they already own one, and `MEMBERSHIP_LIMIT` at 10 memberships.
- **Two context functions:**
  - `getAccountContext()`: the signed-in user, organization optional.
  - `getAppContext()`: also needs an active organization, otherwise it redirects to `/welcome`.
- **`NO_ORGANIZATION`:** returned by `createSurvey` without an active organization. The client sends the user to `/welcome`.

## Requirements

### Registration and sign-in

- **`registerSchema`:** drops `organizationName`. `ORGANIZATION_NAME_MAX` moves to `src/lib/organizations/schema.ts`, with `organizationSchema = { name: trimmed, 1–80 }`.
- **`registerOwner` → `registerUser`:** creates only the user (scrypt hash, `emailVerified: null`, `isActive: true`). `POST /api/v1/auth/register` and `RegisterForm` follow, without the organization field and its i18n keys.
- **`src/auth.ts` adapter:** `createUser` uses the Prisma adapter's default, a plain user. Update the comment that says a new Google user becomes an owner.
- **`verifyCredentials`:** drops the membership condition. An account without an organization can sign in.
- **After sign-in or registration:** still goes to `/dashboard`. `getAppContext` sends a user without an organization on to `/welcome`.

### Contexts (`src/server/app-context.ts`)

- **`AccountContext`:** `user`, `memberships`, `ownsOrganization`, and `organization: Organization | null` (the active one, phase 1 rules). Exported through `getAccountContext()`, which redirects to sign-in without a usable account (deleted or inactive).
- **`getAppContext()`:**
  - Calls `getAccountContext()`.
  - Redirects to `/welcome` when `organization` is null.
  - Returns the narrowed `AppContext`, as today.
  - Every organization page (`/dashboard`, `/surveys/**`, `/users/**`) and action keeps calling it.
- **`getSessionAppContext()`:** a non-redirecting variant for Server Actions, returning `{ status: "signed-out" | "no-organization" } | { status: "ok", context }`.

### `(app)` layout and sidebar

- **`(app)/layout.tsx`:** uses `getAccountContext()`. `AppShellProvider` gets `currentOrganizationId: string | null`.
- **With no organization:**
  - The top bars hide the organization switcher.
  - Dashboard, Surveys and Users in `NavMain` link to `/welcome`, with no active state.
  - `/profile` keeps working.
- **`OrganizationSwitcher`:** gains a "Create organization" item while `ownsOrganization` is false, linking to `/welcome`.

### `/welcome`

- **Route:** new group `src/app/(onboarding)/welcome/page.tsx`.
- **Layout:** logo, a small user menu (name, theme, language, sign out), and a centered column. No sidebar.
- **Access:**
  - Uses `getAccountContext()`.
  - A user who already owns an organization is redirected to `/dashboard`.
  - A user without one but with memberships can still open it, from the switcher.
- **Heading:** "Welcome, {name}" plus a short explanation (you need an organization to create surveys).
- **"Create my organization" card:**
  - The name field (`organizationSchema`), with the user's name as placeholder, and a submit button with a pending state.
  - Errors as field or toast messages.
- **After creating:** cookie set to the new organization, then `/dashboard`.
- **Phase 4** adds the "Pending invitations" card below.

### Create organization

- **Action:** `src/actions/organizations.ts` `createOrganization(values)` → `src/lib/organizations/service.ts`.
- **One transaction:**
  1. Lock the user row (`SELECT … FOR UPDATE`).
  2. Already owns one → `OWNER_LIMIT`.
  3. Memberships ≥ 10 → `MEMBERSHIP_LIMIT`.
  4. Create the organization (`ownerId`) and the owner membership.
- **`P2002` on `ownerId`** maps to `OWNER_LIMIT`.
- **Constants:** `MAX_MEMBERSHIPS = 10` in `src/lib/plans/limits.ts` (shared).
- **After the transaction:** expire `user:{id}`, set `panda-org`.

### Survey creation needs an organization

- **`createSurvey` action:** uses `getSessionAppContext()`. Without an organization it returns `{ ok: false, error: "NO_ORGANIZATION" }`.
- **`SurveyForm`:** on `NO_ORGANIZATION`, shows a toast and `router.push("/welcome")`.
- **The survey service:** checks inside the create transaction that the user has an **active membership** in `scope.organizationId`, otherwise `NO_ORGANIZATION`.
- **`/surveys/new`:** calls `getAppContext()` itself (redirect to `/welcome`).
- **The "New survey" buttons:** live only on organization pages, so no change.

### Proxy and i18n

- **`src/proxy.ts`:** the matcher adds `/welcome`.
- **New namespaces:** `onboarding` (welcome, create organization) and `organizations` (create, errors `OWNER_LIMIT`, `MEMBERSHIP_LIMIT`), plus `surveys.errors.NO_ORGANIZATION`. Both languages, key check script passing.

### Seed

- Add **Nora Díaz** (`nora@example.com`, dev password), with no memberships, to try `/welcome`.

## Testing

1. **New accounts land on `/welcome`:**
   - Register by email → `/welcome`, no organization in Neon.
   - Google sign-up with a new account → same.
2. **Create an organization:**
   - Creating "Nora Studio" goes to `/dashboard` with it active. The switcher shows it, and "Create organization" is gone.
   - A second create (two tabs, or a parallel request) → `OWNER_LIMIT`. Only one organization exists.
3. **The 10-membership limit:** a user with 10 memberships (inserted by hand) cannot create one → `MEMBERSHIP_LIMIT`.
4. **Without an organization:**
   - `/dashboard`, `/surveys` and `/surveys/new` redirect to `/welcome`.
   - `/profile` works.
   - Posting the `createSurvey` action directly → `NO_ORGANIZATION`.
5. **Membership removed mid-session:** removing Marco's only membership in another tab, then submitting a survey → `NO_ORGANIZATION` and redirect to `/welcome`.
6. **Existing users:** Jordan, Ana and Miguel are unaffected.
7. **Checks:** `yarn lint` and `tsc` pass.

## References

- @docs/subscriptions.md
- @src/server/auth-users.ts
- @src/auth.ts
- @src/lib/auth/schema.ts
- @src/components/auth/RegisterForm.tsx
- @src/app/api/v1/auth/register/route.ts
- @src/server/app-context.ts
- @src/app/(app)/layout.tsx
- @src/components/layout/NavMain.tsx
- @src/actions/surveys.ts
- @src/lib/surveys/service.ts
- @src/proxy.ts
