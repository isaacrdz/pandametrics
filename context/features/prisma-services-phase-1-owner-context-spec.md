# Prisma Services Phase 1 — Owner Account and App Context Spec

## Overview

Phase 1 of 4 of moving the app's services from the in-memory stores to Prisma. It covers:

- **the first real owner account:** Miguel Rayon, owner and only member of the new organization Leyinork, created by the seed;
- **the app context from the database:** `getAppContext` (current user and organization) reads Neon instead of the mock, cached and tagged.

Users, surveys and responses keep their in-memory stores until phases 2–4.

Full research in `docs/prisma-services.md` (sections 2, 3.6, 3.7 and 6).

## Decisions (from the research)

- **Default dev user: Jordan Davis** (`jordan@acme.co`). `PANDA_DEV_USER_EMAIL` switches the acting user; `miguel@ellyonsoft.com` works as Miguel in Leyinork.
- **Owner password: no `.env` variable.**
  - The seed holds only the precomputed scrypt hash (`OWNER_PASSWORD_HASH`, `salt:hash` format of `src/lib/users/password.ts`).
  - The plain password is never written to any file, commit or command argument.
- **Caching:** `"use cache"` + `cacheTag`, invalidated with `updateTag` from Server Actions.

## Requirements

### Owner account in the seed (`prisma/seed.ts`)

- **When:** a separate "owner account" step after the demo data, outside `src/lib/seed-data.ts`, so the mock is unchanged.
- **Organization:** id `objectId(organization, 3)`, name **Leyinork**, `activeSurveyCount: 0`, `createdAt` / `updatedAt` = the run time.
- **User:**
  - id `objectId(user, 9)`, name **Miguel Rayon**, email **miguel@ellyonsoft.com**, phone **+528135574189**;
  - role `OWNER`, `isActive: true`, `organizationId` = Leyinork;
  - `passwordHash` = `OWNER_PASSWORD_HASH`, `emailVerified` = `createdAt`.
- **Idempotent:**
  - the delete step includes Leyinork's id and Miguel's email;
  - running it twice gives the same rows and no `P2002`;
  - the logged counts add "1 owner organization, 1 owner".
- **Hash generation:** a one-off script `scripts/hash-password.ts` (`npx tsx scripts/hash-password.ts`).
  - It reads the password from a hidden prompt (`node:readline` with muted output), not from an argument, so it never lands in the shell history.
  - It prints `hashPassword()` output in the same format as `password.ts`, repeating its few lines because `password.ts` is server-only.
  - The printed hash is pasted into `seed.ts` once.
- **Verification helper:** after seeding, a local check confirms `verifyPassword(<password>, OWNER_PASSWORD_HASH)` is true. Run it with the hidden prompt too; it is not committed as a test.

### App context from the database

- `src/server/app-context.ts` (server-only):
  - `getAppContext()` is async and returns `{ user, organization, organizations }`, the same shape as today;
  - the user is read by `process.env.PANDA_DEV_USER_EMAIL ?? "jordan@acme.co"`, with `deletedAt: null`, `isActive: true` and **without `passwordHash`** (`USER_PUBLIC_SELECT`);
  - the organization is the user's organization;
  - `organizations` is `[organization]`: a user belongs to one organization, so the switcher shows only it.
- Errors in development:
  - unknown email, or a user without an organization: throw a clear error naming `PANDA_DEV_USER_EMAIL`;
  - inactive or deleted user: throw as well (no silent fallback to the mock).
- **Caching:** the database read goes in a `"use cache"` function keyed by email, with `cacheTag("app-context", "user:<email>")`. The layout keeps a static shell, and the profile action invalidates it.
- `src/lib/dashboard.ts` keeps `getPublicSurveyUrl` and `getDashboardData`. Its `getAppContext` becomes a re-export of the async one, or callers import from the new module.
- **Callers become `await getAppContext()`:**
  - `(app)/layout.tsx`;
  - every admin page (`dashboard`, `surveys`, `surveys/[id]`, `surveys/new`, `users`, `users/[id]`, `users/new`, `profile`);
  - `actions/surveys.ts`, `actions/users.ts`.
- **Bridge until phases 2–4:** the stores still hold the mock data. When the acting user is Jordan (Acme), everything works as today. When it is Miguel, the in-memory lists for Leyinork are empty, which is expected. A user created in Leyinork only exists in memory until phase 2.
- **Profile edits** (still in memory in this phase): after `updateProfile`, the action calls `updateTag("user:<email>")` so the sidebar name refreshes. Phase 2 moves the write to Prisma.

### Environment

- `.env.example`: `PANDA_DEV_USER_EMAIL="jordan@acme.co"`, with a comment that it is the acting user until Auth.js.
- `.env`: optional; absent means Jordan.

## Verification

- **Lint, types and build:**
  - `yarn lint`, `tsc --noEmit`, `yarn build`;
  - no "blocking-route" / uncached-data error;
  - the admin routes stay `◐` (partial prerender).
- **Seed:**
  - `npx prisma db seed` twice: the same counts both times, plus Leyinork and Miguel;
  - in the database, Leyinork has exactly one user (Miguel, `OWNER`, active), and Acme still has its 8.
- **Password:**
  - `verifyPassword` with the owner password (hidden prompt) returns true;
  - `git grep` and `git log -S` for the plain password find nothing.
- **Default user (Jordan):**
  - the sidebar shows Jordan Davis;
  - the switcher shows only Acme Inc.;
  - dashboard, surveys and users work as before.
- **Miguel** (`PANDA_DEV_USER_EMAIL=miguel@ellyonsoft.com`, then restart):
  - the sidebar shows Miguel Rayon, the switcher shows only Leyinork;
  - the dashboard, survey table and user table are empty (in-memory stores).
- **Unknown email:** the clear development error.
- **No `passwordHash`** in the HTML or RSC payload of any page.

## References

- @docs/prisma-services.md
- @prisma/seed.ts
- @src/lib/seed-data.ts
- @src/lib/users/password.ts
- @src/lib/dashboard.ts
- @src/app/(app)/layout.tsx
- @src/server/prisma.ts
- `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cacheTag.md`, `updateTag.md`
