# Auth Phase 1 — Auth.js Core + Google Provider

## Overview

Phase 1 of 3. Set up Auth.js v5 (`next-auth@beta`) with the Prisma adapter and Google OAuth, protect the admin routes with the Next.js 16 proxy, and make the session the acting user instead of `PANDA_DEV_USER_EMAIL`. Use the Auth.js default sign-in page for testing (custom pages come in phase 3).

Full research: `docs/auth.md`.

## Requirements

### Packages and environment

- Install `next-auth@beta` (5.0.0-beta.x; `@latest` is v4) and `@auth/prisma-adapter`.
- No migration: `Account`, `Session`, `VerificationToken` and the `User` auth columns are already in the `init` migration.
- Environment (values set by the user, never committed): `AUTH_SECRET` (`npx auth secret`), `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`. Add the names to `.env.example`, and remove `PANDA_DEV_USER_EMAIL` from it.
- Google Cloud Console setup, done by the user (`docs/auth.md` section 3.1):
  - consent screen: External, Testing, test users;
  - scopes `openid`, `email`, `profile`;
  - a Web OAuth client with the redirect URIs `http://localhost:3000/api/auth/callback/google` and `http://localhost:3001/api/auth/callback/google`.

### Split config

- `src/auth.config.ts`, with no Prisma imports:
  - `Google({ allowDangerousEmailAccountLinking: true })`;
  - `session: { strategy: "jwt" }`;
  - `jwt` / `session` callbacks that copy the user id into the token and `session.user.id`.
- `src/auth.ts`:
  - `NextAuth({ ...authConfig, adapter })`, exporting `handlers`, `auth`, `signIn`, `signOut`;
  - the adapter is `PrismaAdapter(prisma)` with the app's client (`src/server/prisma.ts`), cast if the generated-client types differ.
- `src/app/api/auth/[...nextauth]/route.ts`: `export const { GET, POST } = handlers`.
- `src/types/next-auth.d.ts`: `Session["user"]["id"]: string` and `JWT.id`.

### Sign-in rules (`signIn` callback and adapter)

- **Google**: require `profile.email_verified === true`.
- **Existing email**:
  - an inactive or soft-deleted user is rejected (`AccessDenied`);
  - an active user signs in, and the first time an `Account` row (`provider: "google"`) is linked to them.
- **Linking an unverified user**: when Google links to a user whose `emailVerified` is `null` (self-registered), set `emailVerified` and clear `passwordHash`. The verified Google owner takes over the account.
- **New email (open sign-up)**: wrap the adapter's `createUser` so that one transaction creates an organization named after the user and the user as `OWNER` of it (`organizationId`, `role: OWNER`, `isActive: true`). No user is ever created without an organization.
- Fill `image` with the Google photo only when the user has none; never overwrite a name or photo set in `/profile`.

### Route protection (`src/proxy.ts`)

- `const { auth } = NextAuth(authConfig); export const proxy = auth((request) => ...)`, as a named export. The handler redirects signed-out requests itself, instead of an `authorized` callback, whose default redirect copies the page's query string into the sign-in URL.
- Only optimistic checks from the session cookie, no database access (the proxy runs on every route, including prefetches).
- `matcher`: `/dashboard/:path*`, `/surveys/:path*`, `/users/:path*`, `/profile`. Signed-out visitors are redirected to sign-in with a `callbackUrl`.
- Public: `/` (landing), `/s` (kiosk, including its submit action), `/api/auth/*`, static files and `/vendor/*`.

### Acting user from the session (`src/server/app-context.ts`)

- `getAppContext()`:
  - reads `auth()` and redirects to sign-in without a session;
  - otherwise returns `loadAppContext(session.user.id)`.
- `loadAppContext(userId)` stays `"use cache"` with the tags `app-context` and `user:<id>`, keyed by **id** (not email). It redirects to sign-in when the user is inactive, deleted or has no organization.
- `setUsersActive` / `softDeleteUsers` / own-profile edits expire `user:<id>`, so a deactivated user's live session ends on the next request.
- **Cache Components**: the session is request data.
  - The admin layout keeps the frame static and moves the user-dependent parts (sidebar user, `AppShellProvider` data, `{children}`) behind `<Suspense>` with skeletons.
  - `yarn build` must have no uncached-data errors, and the admin routes stay `◐`.
- Remove every `PANDA_DEV_USER_EMAIL` reference (`app-context.ts`, `.env.example`, overview section 8 note).

### Sign out

- One Server Action calling `signOut({ redirectTo: "/sign-in" })`, used in two places:
  - **`NavUser` menu**: "Sign out" after the theme toggle. The avatar keeps opening the menu (My profile, theme, Sign out).
  - **`/profile`**: a "Sign out" button in `ProfilePictureCard`.
- Translated copy in `en` / `es`.
- Until phase 3, `/sign-in` is the Auth.js default page (`/api/auth/signin`); point the redirect there or set `pages.signIn` in phase 3.

## Key Gotchas

Use Context7 to verify the newest config and conventions.

- `next-auth@beta`, not `@latest`.
- `src/proxy.ts` sits at the same level as `app/`; use a named export (`export const proxy`).
- In Next 16 the proxy runs on Node.js; the split config still keeps Prisma out of it.
- Don't set a custom `pages.signIn` yet: use the default page.
- No secrets in code, commits or logs; the user fills `.env`.

## Testing

1. Signed out: `/dashboard`, `/surveys`, `/users` and `/profile` redirect to sign-in. `/` and `/s?code=STORE7` (including a kiosk submit) still work.
2. "Sign in with Google" as `miguel@ellyonsoft.com` (a test user) → back to the requested page in Leyinork. An `Account` row is linked to the existing user (no new user).
3. A Google account with a new email → a new organization with that user as `OWNER`; they see only their empty organization, and Jordan's data is not visible.
4. Deactivate a signed-in user from another account → their next request goes to sign-in.
5. Sign out from the sidebar menu and from `/profile` → session cleared, protected routes redirect again.
6. `yarn lint`, `tsc --noEmit`, `yarn build` (admin routes `◐`, no uncached-data errors).

## References

- @docs/auth.md
- Edge compatibility / split config: https://authjs.dev/guides/edge-compatibility
- Prisma adapter: https://authjs.dev/getting-started/adapters/prisma
- Google provider: https://authjs.dev/getting-started/providers/google
- `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`, `02-guides/authentication.md`
