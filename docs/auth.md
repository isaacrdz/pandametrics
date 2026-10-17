# Authentication — Auth.js v5 with Google and Credentials

Research for replacing the acting user (`PANDA_DEV_USER_EMAIL`) with real sign-in. It reviews the four auth specs against the current code, switches the social provider from GitHub to Google, and lists what Google sign-in needs.

Sources: the four specs in `context/features/`, `prisma/schema.prisma`, `src/server/app-context.ts`, `src/lib/users/password.ts`, the Next.js 16.4 docs in `node_modules/next/dist/docs` (Proxy, Authentication guide) and the Auth.js docs (Context7 `/websites/authjs_dev`: Google provider, edge compatibility, Prisma adapter).

---

## 1. Current state

### 1.1 Database

The auth models are **already in the schema and in the `init` migration** (Prisma + Neon setup): `Account` (`@@id([provider, providerAccountId])`), `Session`, `VerificationToken`, and `User` has every column Auth.js uses (`name`, `email @unique`, `emailVerified`, `image`). So:

- **No `add-auth-models` migration is needed.** The master spec's `npx prisma migrate dev --name add-auth-models` would create an empty migration. Run `npx prisma migrate dev --create-only` only if something actually changes.
- `User.passwordHash` already exists (the specs say "add password field").
- `User.organizationId` is **nullable**, and `role` / `isActive` have defaults. So the Prisma adapter can create a user, but such a user has no organization, and `getAppContext` rejects it today ("has no organization"). See decision 4.2.

### 1.2 Passwords

`src/lib/users/password.ts` hashes with **scrypt** from `node:crypto`, stored as `salt:hash` (hex). Every stored hash uses that format:

- the 8 seeded demo users (`panda-dev-1`);
- the owner Miguel (`OWNER_PASSWORD_HASH`, precomputed, never in plain text);
- users created or edited from `/users` and `/profile`.

The specs say **bcryptjs ("already installed")**, but it **is not installed**, and switching would invalidate every existing hash. The Credentials `authorize` should call the existing `verifyPassword`. The file's own comment says a future algorithm change only touches that file.

### 1.3 Acting user today

`src/server/app-context.ts` → `getAppContext()` reads `PANDA_DEV_USER_EMAIL` (default `jordan@acme.co`) and loads the user and organization inside `"use cache"` (tags `app-context`, `user:<email>`). Because it is cached and depends on no request data, the admin layout's sidebar and top bar are part of the **static shell** (routes `◐`).

Callers:

- **Layout**: `(app)/layout.tsx`, outside Suspense: sidebar user and `AppShellProvider`.
- **Pages**: `dashboard`, `surveys` (top-bar count, outside Suspense), `surveys/[id]`, `users`, `users/[id]`, `profile`.
- **Server Actions**: `actions/surveys.ts` and `actions/users.ts`, through `getScope()`. They use the organization and user ids, never values sent by the client.

So every service already receives its scope from one module. Auth.js only has to replace how that module finds the user (the "Auth.js replaces only this module" note in the file).

### 1.4 UI pieces that already exist

- `NavUser` (sidebar footer): avatar, name, a menu with "My profile" and the theme toggle. **There is no sign out yet.**
- `UserAvatar`: Radix `AvatarImage` (a plain `<img>`) with an initials fallback. A Google photo URL works as is: there is no `next/image`, so no `remotePatterns` are needed.
- `/profile`: changing the password requires the current one (`WRONG_PASSWORD`).
- `LANDING_LINKS` (`signIn`, `signUp`, `start`) all point to `/dashboard` until auth exists.
- i18n: all copy in `src/messages/{en,es}.json`, rendered by Client Components (the language lives in `localStorage`).

---

## 2. Versions and compatibility

| Package | Version | Notes |
| --- | --- | --- |
| `next-auth` | `5.0.0-beta.32` (`@beta`; July 2026) | `@latest` is still v4 (4.24.x). Peer dependency `next: ^14 \|\| ^15 \|\| ^16`, React 19 OK |
| `@auth/prisma-adapter` | `2.11.3` | Receives our client instance. The types expect `@prisma/client`, and ours is generated in `src/generated/prisma`, so a cast may be needed. Check at install |
| `next` | `16.4.0` | The middleware file is `proxy.ts` |

**Proxy in Next 16** (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`):

- it runs on the **Node.js runtime**, not Edge;
- it runs on **every route, prefetches included**, so it should only make **optimistic checks** from the cookie and never query the database;
- real authorization belongs in a **data access layer** close to the data.

Consequences:

- The split config is not strictly required for runtime compatibility anymore (Prisma could load in Node). It is **still recommended**: it keeps Prisma and the Prisma adapter out of the code that runs on every request.
- The proxy only answers "is there a valid session cookie?". `getAppContext` keeps checking the user in the database (active, not deleted, has an organization).

---

## 3. Google sign-in — what is needed

### 3.1 Google Cloud Console (one time)

1. **Project**: create one (e.g. "Panda Metrics") at console.cloud.google.com, or reuse one.
2. **OAuth consent screen** (Google Auth Platform → Branding / Audience / Data access):
   - user type **External**;
   - app name "Panda Metrics", support email, developer contact email; logo optional (a logo starts brand verification);
   - scopes: only the defaults **`openid`, `email`, `profile`**. These are non-sensitive, so no Google verification is needed;
   - publishing status **Testing** while developing: only the listed **test users** can sign in (up to 100). Add `miguel@ellyonsoft.com` and anyone testing. Move to **In production** before real users sign in. With these scopes that is immediate, without review.
3. **Credentials → Create OAuth client ID** → type **Web application**:
   - **Authorized JavaScript origins**: `http://localhost:3000`, `http://localhost:3001` (the dev server currently runs on 3001), later `https://<production domain>`;
   - **Authorized redirect URIs** (exact match, port included):
     - `http://localhost:3000/api/auth/callback/google`
     - `http://localhost:3001/api/auth/callback/google`
     - `https://<production domain>/api/auth/callback/google`
4. Copy the **Client ID** and **Client secret**. The secret is shown in full once; download the JSON or copy it right away.

A separate OAuth client for production (its own secret, only production URIs) is better practice than one shared client.

### 3.2 Environment variables

```bash
# Auth.js: signs and encrypts the session JWT. Generate with `npx auth secret` (or openssl rand -base64 33)
AUTH_SECRET=
# Google OAuth client (Google Cloud Console → Credentials)
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
# Only behind a proxy / custom host in production (Vercel sets it automatically)
# AUTH_TRUST_HOST=true
# AUTH_URL=https://<production domain>
```

- With the `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` names, `Google()` needs no arguments (Auth.js infers them).
- Add the names (without values) to `.env.example`. `PANDA_DEV_USER_EMAIL` is removed at the end.
- `PANDA_PUBLIC_URL` stays: kiosk links and `metadataBase` use it.

### 3.3 Code

```ts
// src/auth.config.ts — no Prisma imports
import Google from "next-auth/providers/google";

providers: [
  Google({
    // Users are pre-created (seed, /users) with the same email: let a verified Google account
    // attach to them instead of failing with OAuthAccountNotLinked
    allowDangerousEmailAccountLinking: true,
  }),
  Credentials({ authorize: () => null }), // replaced in auth.ts
]
```

- **No refresh token or offline access**: we only need identity (name, email, photo), never Google APIs. So no `access_type: "offline"` and no `prompt: "consent"` (that would ask for consent on every sign-in).
- **`signIn` callback**:
  - for `google`, require `profile.email_verified === true`;
  - reject an existing user who is inactive or deleted;
  - return `false` in those cases, and the custom page shows `AccessDenied`. New emails are allowed (open sign-up, 4.1).
- **Email linking**: Jordan, Miguel and the other users exist without an `Account` row. Without `allowDangerousEmailAccountLinking`, signing in with a Google account of the same email fails with `OAuthAccountNotLinked`. Turning it on is reasonable **only for Google** (it verifies emails) and together with the `email_verified` check. On the first Google sign-in the adapter adds an `Account` (`provider: "google"`) to the existing user.
- **Profile data**: Google returns `name`, `email` and `picture` (→ `image`). If you want the Google photo for users without one, fill `image` only when empty, in the `signIn` callback or the `linkAccount` event. Never overwrite a name or photo the user set in `/profile`.

---

## 4. Decisions (answered 2026-10-16)

### 4.1 Open sign-up: anyone may sign in

> **Superseded (2026-10-16):** sign-up no longer creates an organization, neither with Google nor on `/register` (which no longer asks for an organization name). A new account starts with no organization and creates its own on `/welcome`, or joins one through an invitation. See `docs/subscriptions.md`, section 5. The text below and in 4.2 describes the original decision.

Any Google account with a verified email can sign in. An email that is not in `User` creates a **new user who is `OWNER` of a new organization** (named after the user, e.g. "Miguel Rayon"; renaming comes with the future organization settings). An existing email signs in to that user.

Implementation: the adapter's `createUser` is wrapped (`{ ...PrismaAdapter(prisma), createUser }`). One transaction creates the organization and the user (`role: OWNER`, `organizationId`), so no user ever exists without an organization.

### 4.2 `/register` stays

`/register` asks for name, email, password and confirm password, plus an **organization name**. It creates the organization and its `OWNER` in one transaction, hashing with scrypt. A taken email returns `EMAIL_TAKEN`.

**Risk with open sign-up + email linking**: someone could register with another person's email and a password. When the real owner of that email later signs in with Google, the account would link to the attacker's user.

Mitigation (no email sending needed yet): when Google links to a user whose `emailVerified` is `null` (self-registered, never verified), the link sets `emailVerified` and **clears `passwordHash`**. The verified Google owner takes over and the unverified password stops working.

Seeded users have `emailVerified` set, so nothing changes for them. Email verification on register (Resend / nodemailer) is later hardening.

### 4.3 Hashing

Keep **scrypt** (`verifyPassword` / `hashPassword` in `password.ts`) and drop bcryptjs from the specs. The existing hashes, including the owner's, keep working.

### 4.4 Users who only use Google

They have `passwordHash = null`:

- Credentials sign-in fails for them, as it should.
- In `/profile`, the "Change password" card only shows for accounts that have one (signed up with email and password); Google sign-ups see no password card and the server never sets one for them (superseded the earlier "Set a password" variant). This needs a `hasPassword` flag in the profile data, never the hash.

### 4.5 Deactivated or deleted users with a live session

With JWT the cookie stays valid until it expires. The fix is the data access layer:

- `getAppContext` reloads the user by id (cached, tag `user:<id>`) and **redirects to sign-in** if they are inactive, deleted or have no organization;
- `setUsersActive` / `softDeleteUsers` expire `user:<id>`;
- sign-in (both providers) also rejects inactive or deleted users.

### 4.6 Sign out in two places

- In the sidebar user menu (`NavUser`): "My profile", the theme toggle and **"Sign out"**. The menu stays; the avatar keeps opening it.
- On `/profile`: a **"Sign out"** button in `ProfilePictureCard`.

Both use the same Server Action (`signOut({ redirectTo: "/sign-in" })`).

### 4.7 Users list: "Invite user" (coming soon) instead of "New user"

With open sign-up, people join by signing up or, later, by invitation:

- the top-bar "New user" button (`NewUserButton`, `/users/new`) becomes **"Invite user"**, disabled with a "Coming soon" tooltip (`aria-disabled`, like Settings in the sidebar);
- the create flow is removed: `/users/new`, the `create` mode of `UserForm`, the `createUser` action and its service function;
- the edit mode and `/users/[id]` stay.

## 5. Architecture

### 5.1 Files

| File | Content |
| --- | --- |
| `src/auth.config.ts` | Google + Credentials placeholder, `session: { strategy: "jwt" }`, `pages: { signIn: "/sign-in", error: "/sign-in" }` (phase 3), and `jwt` / `session` callbacks that copy `user.id` into the token and the session. No Prisma |
| `src/auth.ts` | `NextAuth({ ...authConfig, adapter, providers: [Google(...), Credentials({ authorize })] })`, where `adapter` is the Prisma adapter with `createUser` wrapped to create the organization (4.1); `authorize` validates with Zod, finds the user by email (active, not deleted), calls `verifyPassword`, and returns `{ id, name, email, image }`; the `signIn` callback with the rules of 3.3 / 4.5 and the unverified-password clearing on link (4.2); exports `handlers, auth, signIn, signOut` |
| `src/app/api/auth/[...nextauth]/route.ts` | `export const { GET, POST } = handlers` |
| `src/proxy.ts` | `const { auth } = NextAuth(authConfig); export const proxy = auth(...)` plus a `matcher` |
| `src/types/next-auth.d.ts` | `Session["user"]["id"]: string`, `JWT.id` |

The phase 1 spec puts the config in `src/`; the master spec puts it in `src/lib/`. Use **`src/auth.ts` and `src/auth.config.ts`** (the Auth.js convention, next to `src/proxy.ts`).

Credentials **requires the JWT strategy** (Auth.js does not create database sessions for Credentials). The `Session` table stays unused; keep it for a possible later database strategy.

### 5.2 Protected and public routes

- **Protected**: `/dashboard`, `/surveys/*`, `/users/*`, `/profile`. The specs only mention `/dashboard`.
- **Public**:
  - `/` (landing) and `/s` (kiosk);
  - `/sign-in`, `/register` (if kept), `/api/auth/*`;
  - static files: `/_next/*`, `/vendor/*` (ZXing), icons, OG images.

Suggested matcher:

```ts
export const config = {
  matcher: ["/dashboard/:path*", "/surveys/:path*", "/users/:path*", "/profile"],
};
```

An explicit list of protected prefixes is safer here than a negative regex: the kiosk and the landing can never be blocked by mistake.

Kiosk Server Actions (`submitSurveyResponse`) are POSTs to `/s` and stay public. The admin actions are already scoped by `getAppContext`, which now requires a session.

### 5.3 Data access layer (replaces `PANDA_DEV_USER_EMAIL`)

```ts
// src/server/app-context.ts
export async function getAppContext(): Promise<AppContext> {
  const session = await auth();                 // reads the cookie: request data
  if (!session?.user?.id) redirect("/sign-in");
  return loadAppContext(session.user.id);       // "use cache", tags app-context + user:<id>
}
```

- The cached part is keyed by **user id** (not email), so an email change does not orphan the cache.
- **Cache Components impact**:
  - `auth()` reads cookies, which is request data. The admin layout calls `getAppContext` **outside Suspense**, so the build would fail with the uncached-data-outside-Suspense error.
  - Fix: the layout renders the frame (sidebar shell, `SidebarProvider`) statically and puts the user-dependent parts (`NavUser`, `AppShellProvider` data, `{children}`) behind a **`<Suspense>` with skeletons**. The `/surveys` and `/users` top-bar counts already sit inside page content, so they follow.
  - The admin routes stay `◐`, with a smaller static shell.
- The actions' `getScope()` keeps calling `getAppContext()`: no signature changes in the services.
- Remove `PANDA_DEV_USER_EMAIL` from `.env.example`, `app-context.ts` and `project-overview.md` section 8.

### 5.4 Sign out and UI

- **Sign out**: in the `NavUser` menu after the theme toggle, and as a button on `/profile` (4.6). Both call one Server Action with `signOut({ redirectTo: "/sign-in" })`.
- `LANDING_LINKS`: `signIn` → `/sign-in`, `signUp` → `/register`, `start` → `/dashboard` (the proxy sends logged-out visitors to sign in).
- `/sign-in`:
  - email + password with the existing form patterns (Zod, `PasswordInput`);
  - a **"Continue with Google"** button (the official "G" logo and a white / outlined button, following Google's branding guidelines);
  - errors from `?error=` mapped to messages: `CredentialsSignin`, `AccessDenied`, `OAuthAccountNotLinked`, `Configuration`, default;
  - `callbackUrl` respected (only same-origin paths).
- Copy in an `auth` namespace in `en.json` / `es.json`. The pages are Client Components like the rest (the language lives in `localStorage`).
- Optional, recommended: a rate limit on Credentials sign-in, reusing the kiosk limiter pattern (per IP + email).

---

## 6. Corrections to the specs

| Spec | Says | Should say |
| --- | --- | --- |
| master, phase 1 | GitHub provider, `AUTH_GITHUB_ID/SECRET` | **Google** provider, `AUTH_GOOGLE_ID/SECRET` (done in the specs) |
| master | Add Account / Session / VerificationToken + migration `add-auth-models` | Already in the schema and the `init` migration; no migration needed |
| master | `src/lib/auth.config.ts`, `src/lib/auth.ts`; `proxy.ts` with `export default` | `src/auth.config.ts`, `src/auth.ts`; `export const proxy = auth(...)` (phase 1 has it right) |
| master | "Next.js 15 + Prisma 7 Edge Compatibility" | Next.js 16: Proxy runs on Node.js; the split is kept to keep Prisma out of the proxy |
| phase 1 | Protect `/dashboard/*` | `/dashboard`, `/surveys`, `/users`, `/profile` |
| phase 2 | bcryptjs "already installed"; add password field | Not installed; keep **scrypt** (`password.ts`); `passwordHash` already exists |
| phase 2 | `POST /api/auth/register` route | `POST /api/v1/auth/register`: `/api/auth/*` belongs to Auth.js's catch-all, and the overview puts the API under `/api/v1` |
| phase 2 | Registration creates a user | It also creates the user's organization, with an organization name field (4.2) |
| phase 3 | Avatar "from GitHub" | From Google (`image`) or initials: `UserAvatar` already does this |
| phase 3 | Avatar click goes to `/profile` and also opens a dropdown | The avatar opens the menu (My profile, theme, Sign out); sign out also on `/profile` (4.6) |
| all | Session `user.id` only | Also: inactive / deleted users rejected at sign-in and by the data access layer (4.5) |

---

## 7. Phases

1. **Auth core + Google** (`auth-phase-1-spec.md`):
   - install `next-auth@beta` and `@auth/prisma-adapter`;
   - split config, route handler, `proxy.ts` with the protected prefixes, types;
   - Google with `email_verified`, email linking (clearing an unverified password), and new users created with their own organization;
   - `getAppContext` from the session, with the admin layout behind Suspense; `PANDA_DEV_USER_EMAIL` removed;
   - Auth.js default sign-in page;
   - sign out in `NavUser` and on `/profile`.
2. **Credentials + register** (`auth-phase-2-spec.md`): `authorize` with `verifyPassword` (scrypt) and the active / deleted checks; a sign-in rate limit; `POST /api/v1/auth/register` creating the organization and its owner.
3. **Custom UI** (`auth-phase-3-spec.md`):
   - `/sign-in` (email / password + "Continue with Google", error messages, `callbackUrl`) and `/register` (with organization name);
   - `LANDING_LINKS`;
   - "Set a password" for Google-only users (later removed: Google sign-ups get no password card);
   - "Invite user" coming soon, with the create flow removed;
   - en / es copy, responsive and dark mode checks.

### Verification

- Logged out, `/dashboard`, `/surveys`, `/users` and `/profile` redirect to sign-in. `/`, `/s?code=STORE7` and a kiosk submit still work.
- Google with `miguel@ellyonsoft.com` (a test user) → Leyinork, and an `Account` row is linked to the existing user. A new Google email → a new organization with that user as `OWNER`, and the user sees only their empty organization.
- Credentials: Jordan / `panda-dev-1` → Acme; a wrong password → error; a deactivated user → rejected, and a live session is sent to sign-in after deactivation.
- Register: a new organization + owner; a taken email → `EMAIL_TAKEN`. A registered (unverified) email then signed in with Google → linked, password cleared.
- `/users`: "Invite user" disabled with "Coming soon"; `/users/new` is gone (404).
- Sign out clears the session. `yarn build` keeps the admin routes `◐` with no uncached-data errors.
- No `passwordHash`, token or secret in the HTML or RSC payloads.
