# User Authentication

## Overview

Implement Auth.js v5 (`next-auth@beta`) with **Google** and email / password sign-in, replacing the acting user from `PANDA_DEV_USER_EMAIL`. Sign-up is **open**: a new Google account or a registration creates its own organization, with the user as `OWNER`.

Split into 3 phases:

- `auth-phase-1-spec.md`: core, Google, proxy, session as the acting user, sign out;
- `auth-phase-2-spec.md`: Credentials and registration;
- `auth-phase-3-spec.md`: custom pages, profile, "Invite user" coming soon.

## Requirements

- Install `next-auth@beta` and `@auth/prisma-adapter`.
- The Auth.js models (`Account`, `Session`, `VerificationToken`) and `User` auth columns already exist in the `init` migration: no new migration unless something changes.
- Set up Auth.js with the Prisma adapter and the JWT strategy (split config, see notes).
- Add the Google OAuth provider:
  - verified emails only;
  - linking to an existing user with the same email;
  - new emails create a user + organization.
- Add the Credentials provider for email / password, validated with the app's scrypt hashes (`src/lib/users/password.ts`). No bcryptjs.
- Registration (`POST /api/v1/auth/register` + `/register` page): name, email, password, confirm password, organization name. It creates the organization and its owner.
- Sign-in page (`/sign-in`) with the email / password form and a "Continue with Google" button.
- Protect `/dashboard`, `/surveys`, `/users` and `/profile` with `src/proxy.ts`, redirecting signed-out users to sign-in. `/`, `/s` (kiosk) and `/api/auth/*` stay public.
- The session drives `getAppContext` (user + organization). Inactive / deleted users are rejected.
- Sidebar: avatar (Google photo or initials) and name; the avatar menu has My profile, the theme toggle and **Sign out**. Sign out also from `/profile`.
- Users list: "New user" becomes **"Invite user"** (coming soon), and the create flow is removed.

## Notes

Prisma 7, the Prisma adapter and the Next.js 16 proxy file have changed: check the latest documentation (Context7, `node_modules/next/dist/docs`).

- Always use migrations, never `db push`.
- Next.js 16 runs `proxy.ts` on Node.js. The split config is still used, so Prisma never loads in the proxy (it runs on every request).

### Split config

- `src/auth.config.ts`: providers (Google; Credentials with an `authorize: () => null` placeholder), JWT session, callbacks (`jwt`, `session`). NO Prisma imports.
- `src/auth.ts`: extends `auth.config`, adds the Prisma adapter (with `createUser` creating the organization), the real Credentials `authorize` (scrypt), and the `signIn` rules.
- `src/proxy.ts`: `const { auth } = NextAuth(authConfig); export const proxy = auth((request) => ...)`, redirecting signed-out requests itself (the `authorized` callback's default redirect copies the page's query string into the sign-in URL). Only imports from `auth.config.ts`.

## References

- Research: @docs/auth.md (Google Cloud setup, decisions, spec corrections)
- Edge compatibility: https://authjs.dev/guides/edge-compatibility
- Prisma adapter: https://authjs.dev/getting-started/adapters/prisma
- Google provider: https://authjs.dev/getting-started/providers/google
