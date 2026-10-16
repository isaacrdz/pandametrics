# Prisma Services Phase 2 — Users Spec

## Overview

Phase 2 of 4: the users service and the user table read and write Neon through Prisma instead of the in-memory user store. Search, filters, sorting and pagination run in Postgres, and this phase adds the shared `unaccent` migration that phase 3 also uses.

Full research in `docs/prisma-services.md` (sections 3.1, 3.3, 3.5, 3.7).

## Decisions (from the research)

- Search, filters, sort and pagination in the database (`unaccent`), not in memory.
- `passwordHash` never leaves the service: one public select everywhere else.
- Caching: `"use cache"` + `cacheTag("org:<id>:users")`; every user action calls `updateTag`.

## Requirements

### Migration `search_unaccent`

- `npx prisma migrate dev --name search_unaccent --create-only` on the developer branch. The generated SQL is empty (no schema change); add:

  ```sql
  CREATE EXTENSION IF NOT EXISTS unaccent;
  CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
    AS $$ SELECT public.unaccent('public.unaccent', $1) $$;
  ```

- Apply with `npx prisma migrate dev`; `migrate status` up to date; commit the migration.

### Users service (`src/lib/users/service.ts`)

`import "server-only"`, the `prisma` client from `src/server/prisma.ts`, every function `async`. Same names, arguments and return types as today.

- **`USER_PUBLIC_SELECT`:** every user column except `passwordHash`. A `toUser(row)` mapper turns rows into the existing `User` type.
- **Reads:** `listUsers(orgId)`, `getUser(orgId, id)` and `getUserById(id)` filter `deletedAt: null`; the first two also filter by organization.
- **`createUser(scope, input)`:**
  - `create` with `hashPassword(input.password)`, role `MEMBER`, active, in `scope.organizationId`;
  - `P2002` on email → `UserServiceError("EMAIL_TAKEN")`;
  - the email is lowercased as today.
- **`updateUser(scope, id, input)`:**
  - when `id === scope.userId`, the current password is required: select `passwordHash` only for `verifyPassword`, else `WRONG_PASSWORD`;
  - the new hash is written only when a password is sent;
  - `P2002` → `EMAIL_TAKEN`.
- **`updateProfile(scope, input)`:** same as `updateUser` for the signed-in user.
- **`setUsersActive(scope, ids, isActive)` and `setUserActive`:** a transaction that is all or nothing.
  1. Load the targets in the organization (missing → `NOT_FOUND`).
  2. Reject self (`SELF_DEACTIVATE`).
  3. When deactivating, make sure at least one active `OWNER` remains (`LAST_OWNER`).
  4. `updateMany`.
- **`softDeleteUsers(scope, ids)`:** same checks, then set `deletedAt`. The email stays taken; deleted users keep their surveys.
- **Remove** the `globalThis` user map and the `MOCK_USERS` import. `hashPassword` / `verifyPassword` stay in `password.ts`.
- **Survey "created by":** the survey store is still in memory in this phase and resolves `createdBy` through `getUserById`, so it awaits it.

### User table (`src/lib/users/list.ts`)

- `listUsers(orgId, currentUserId, params)` is async. It runs one `$queryRaw` built with `Prisma.sql` fragments (bound parameters only):

| Part | SQL |
| --- | --- |
| Scope | `"organizationId" = ${orgId} AND "deletedAt" IS NULL` |
| Search | `f_unaccent(lower(name)) LIKE ${pattern} ESCAPE '\'`, `OR lower(email) LIKE ${pattern} ESCAPE '\'`, `OR` (only when the query has digits) `regexp_replace(coalesce(phone, ''), '\D', '', 'g') LIKE ${digitsPattern}` |
| Status | `"isActive" = ${active}` when not `all` |
| Order | `name COLLATE "und-x-icu", email` |
| Page | `LIMIT ${size} OFFSET ${offset}` and `COUNT(*) OVER() AS total` |
| Columns | the public columns only (no `passwordHash`) |

- **Pattern:** `'%' + escapeLike(f_unaccent-equivalent of the query) + '%'`, where `escapeLike` escapes `\`, `%` and `_`. Apply `f_unaccent(lower(...))` to the parameter in SQL as well.
- **Page clamp:** like `paginate()`. When the requested page is past the end and the total is greater than 0, query again with the last page.
- **`totalAll`:** `prisma.user.count({ where: { organizationId, deletedAt: null } })`.
- **`now`:** `new Date().toISOString()` (real time; `MOCK_NOW` no longer used here).
- **Removed:** `matchesUserQuery` and the in-memory pagination for users.

### Caching and pages

- **Cached reads:** the reads used by pages are wrapped in `"use cache"` functions with `cacheTag("org:<orgId>:users")`. The list key includes the params.
  - The `/users` top-bar count reads the cached `totalAll` and stays in the static shell.
  - The table stays inside its `Suspense`, since it depends on `searchParams`.
- **Pages to `await`:** `/users`, `/users/[id]` (`getUser`), `/users/new` and `/profile`.
- **`actions/users.ts`:** await the service. On success, replace `revalidatePath` with:
  - `updateTag("org:<orgId>:users")`;
  - `updateTag("user:<email>")` when the acting user's own record changed (the profile, the sidebar name).

## Verification

- `yarn lint`, `tsc --noEmit`, `yarn build` with no uncached-data errors; the migration is applied and committed.
- **As Jordan:**
  - `/users` lists the 8 Acme users in name order;
  - search: "lucia" → Lucía Fernández, "ACME" → all (email), "5512" → Jordan (phone), "%" → no rows (literal), "diego" + status Active → none;
  - pagination 5 / 10 / 25 / 50 and the page clamp (`?page=99` shows the last page);
  - create a user (persists after restart; a duplicate email → "email taken");
  - edit a user, reset a password;
  - edit your profile with a wrong / right current password;
  - deactivate / activate / delete in bulk, all or nothing: including yourself → error, nothing changes;
  - the sidebar name updates after a profile rename (`updateTag`).
- **As Miguel:** `/users` shows only Miguel, who cannot deactivate or delete himself. Creating a user adds a Leyinork member.
- **Payloads:** no `passwordHash` in the RSC payload of `/users`, `/users/[id]` or `/profile`.
- **Seed:** after `npx prisma db seed`, the data is back to the demo state.

## References

- @docs/prisma-services.md
- @src/lib/users/service.ts
- @src/lib/users/list.ts
- @src/lib/users/list-params.ts
- @src/lib/users/password.ts
- @src/actions/users.ts
- @src/app/(app)/users/page.tsx
- @src/app/(app)/profile/page.tsx
- @prisma/schema.prisma
