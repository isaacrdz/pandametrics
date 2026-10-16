# Authentication (Auth.js + Google + Credentials)

## Output

`docs/auth.md`

## Research

Document how to add real sign-in to Panda Metrics with Auth.js v5 (`next-auth@beta`), replacing the acting user from `PANDA_DEV_USER_EMAIL`:

1. **Google OAuth** instead of GitHub, as the social sign-in.
2. **Credentials** (email and password) for the users that already have a password hash.
3. **Custom pages** (sign in, register), route protection with the Next.js 16 `proxy.ts`, and sign out from the sidebar user menu.

The result must review the four auth specs (`auth-phase-1/2/3-spec.md`, `next-auth-master-spec.md`) against the current code and list what has to change, plus everything needed to set up Google sign-in.

## Include

Current state:

- Auth models already in the schema (`Account`, `Session`, `VerificationToken`) and the `User` columns Auth.js uses; whether a migration is still needed.
- Password hashing today (`src/lib/users/password.ts`, scrypt `salt:hash`) and the seeded hashes (demo users, owner), versus the specs' bcryptjs.
- How the acting user is resolved today (`src/server/app-context.ts`, `"use cache"`, `PANDA_DEV_USER_EMAIL`) and every caller (layout, pages, actions).
- Cache Components: what reading the session (cookies) means for the admin layout's static shell.
- Routes that must be protected and routes that must stay public (landing, kiosk `/s`, Auth.js endpoints, assets).
- The sidebar user menu (`NavUser`), avatar (`UserAvatar`), profile password section, landing CTAs (`LANDING_LINKS`).

What to define:

- Package versions (`next-auth@beta`, `@auth/prisma-adapter`) and compatibility with Next 16.4 and Prisma 7 (generated client path).
- Split config (`auth.config.ts` / `auth.ts` / `proxy.ts`), JWT strategy, callbacks (`signIn`, `jwt`, `session`, `authorized`), session type augmentation.
- Google: Google Cloud Console steps, consent screen, redirect URIs (dev ports, production), env variables, verified email check, linking a Google account to an existing user with the same email.
- Who may sign in (existing users only vs. self sign-up), what registration creates (organization membership), inactive / deleted users.
- Data access layer: session → user → organization, replacing `PANDA_DEV_USER_EMAIL`; cache tags.
- Errors and i18n on the custom pages; sign out.
- Spec corrections, open decisions, phases and verification.

## Sources

- @context/features/auth-phase-1-spec.md
- @context/features/auth-phase-2-spec.md
- @context/features/auth-phase-3-spec.md
- @context/features/next-auth-master-spec.md
- @prisma/schema.prisma
- @src/server/app-context.ts
- @src/lib/users/password.ts
- @src/components/layout/NavUser.tsx
- @src/components/landing/landing-links.ts
- `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`, `02-guides/authentication.md`
- Context7: Auth.js (`/websites/authjs_dev`) — Google provider, edge compatibility, Prisma adapter
