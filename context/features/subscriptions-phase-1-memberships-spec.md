# Subscriptions Phase 1 — Memberships and Organization Ownership

## Overview

Phase 1 of 6 of plans and organizations. Move "which organization a user belongs to, and with which role" from `User` to a new `Membership` table. Record each organization's owner in `Organization.ownerId`. Make the organization switcher real.

Nothing changes for the user, except two things:

- the switcher switches between the organizations they belong to;
- deactivating or removing someone in `/users` only affects that organization.

Full research: `docs/subscriptions.md` (sections 1, 3, 4.3 and 4.4).

## Decisions (from the research)

- **`Organization.ownerId @unique`**: one owned organization per user and exactly one owner per organization, with a plain unique constraint (no `partialIndexes` preview).
- **The owner also has a `Membership` with `role: OWNER`**, so lists, the switcher and the later 10-membership limit treat everyone alike. Invariant: `membership.role = OWNER` ⇔ `organization.ownerId = membership.userId`.
- **Deactivation is per organization** (`Membership.isActive`). `User.isActive` / `deletedAt` stay as account-level switches (scripts, support), no longer touched from `/users`.
- **"Delete" in `/users` becomes "Remove from organization"**: it deletes the membership. The account and its surveys stay; `Survey.createdById` keeps "created by".
- **`OWNER_PROTECTED` replaces `LAST_OWNER`**: the owner's membership can never be deactivated or removed. `SELF_DEACTIVATE` stays.
- **Expand / contract**: `User.organizationId` and `User.role` stay in the database, but no code reads or writes them after this phase. Phase 6 drops them.

## Requirements

### Schema and migration

- **`prisma/schema.prisma`:**
  - Add `Membership` (`docs/subscriptions.md` 3.1).
  - Add `Organization.ownerId String @unique` with the `OwnedOrganization` relation (`onDelete: Restrict`).
  - Add the relations `Organization.memberships`, `User.memberships` and `User.ownedOrganization`.
- **Migration:** `npx prisma migrate dev --create-only --name memberships`, then edit the SQL before applying:
  1. Create `Membership` and its indexes.
  2. Add `ownerId` **nullable**. Backfill it with the oldest non-deleted `OWNER` user of each organization (research 3.5).
  3. Organizations still without an owner:
     - Delete them if they have no users, surveys or responses (the seeded "Panda Labs" on the dev branch).
     - Otherwise stop the migration with `RAISE EXCEPTION` naming them.
  4. `SET NOT NULL` and the unique index on `ownerId`.
  5. Insert one membership per non-deleted user with an organization:
     - role `OWNER` for `ownerId`;
     - a second `OWNER` becomes `ADMIN`;
     - otherwise the user's role;
     - `isActive` copied from the user.
  6. Set `User.isActive = true` on every non-deleted account: the deactivation now lives in the membership, so a member reactivated in their organization can sign in again.
- **Check before applying:** run the owner query on Neon (development and production branches) and review the SQL.

### Data access

- **`src/server/app-context.ts`:**
  - **`loadAppContext(userId)`:**
    - Stays `"use cache"` with `user:{id}`.
    - Loads the user and their **active** memberships with their organization.
    - Returns `null` when there is none, as today with "no organization".
    - Drops the `app-context` literal tag.
  - **The active organization** is chosen outside the cache:
    - It comes from the `httpOnly` cookie `panda-org`.
    - The cookie is valid only when its organization is in the user's active memberships.
    - Otherwise: the owned organization, then the oldest active membership.
  - **`AppContext`:** gains `role` (in the active organization) and `memberships`. `organizations` lists every active membership's organization: owned first, then by name.
- **`src/actions/organizations.ts`, `switchOrganization(organizationId)`:**
  - Checks the active membership, otherwise `NOT_FOUND`.
  - Sets the cookie (`sameSite: lax`, `secure` in production, one year).
  - Calls `refresh()`.
- **`OrganizationSwitcher`:** calls the action in a transition instead of keeping local state, with a pending state on the trigger. The success dot stays.
- **`src/server/auth-users.ts`:**
  - `createUserWithOrganization` and `registerOwner` create the organization with `ownerId` and the owner's `Membership` in the same transaction. They no longer set `User.role` / `organizationId`.
  - `verifyCredentials` replaces `!user.organizationId` with "has at least one active membership". Phase 2 removes the check.

### Users service and list (`src/lib/users/`)

- **Everything scopes through the membership** (`organizationId` + `userId`), never `User.organizationId`:
  - `listUsers` / `queryPage` SQL joins `Membership`; the status filter uses `Membership.isActive`.
  - `countListedUsers`, `getUser`, `updateUser` and `USER_PUBLIC_SELECT`.
- **The role comes from the membership.** The `User` type keeps `role` (the role in the current organization), filled from the membership by the services.
- **`setUserActive` / `setUsersActive`:** update `Membership.isActive` in the scope's organization.
- **`softDeleteUsers` becomes `removeUsers`:** deletes the memberships. All or nothing, as today.
- **`assertChangeAllowed`:** `SELF_DEACTIVATE` stays; `LAST_OWNER` becomes `OWNER_PROTECTED` (the organization's `ownerId` is among the ids).
- **Expire tags:** `org:{id}:users` and `user:{id}` for each changed user, so their switcher and context update.

### UI and i18n

- **`/users` delete actions:**
  - The row menu, bulk bar and confirmation dialog say **"Remove from organization"** / "Remove", with copy explaining that the account is not deleted.
  - The owner's row checkbox is disabled, like the current user's.
- **`users.errors.LAST_OWNER`** becomes `OWNER_PROTECTED` ("The organization owner cannot be deactivated or removed"), in `en.json` and `es.json`.

### Seed

- **Panda Labs:** gets an owner, "Valeria Cruz" (`valeria@pandalabs.dev`, dev password), with an owner membership.
- **Memberships:** Acme users get theirs with today's roles and `isActive`. Leyinork: Miguel as owner.
- **Delete order:** memberships, then responses / surveys, then organizations (`ownerId` is `Restrict`), then users.
- **Counts log:** adds memberships.
- **`seed-data.ts`:** `buildOrganizations` returns `ownerId`.

## Testing

1. **Migration on the development branch:**
   - Every organization has `ownerId`.
   - Each user has one membership with the same role and `isActive` as before.
   - `prisma migrate status` is clean.
2. **Same organization as before:** Jordan, Ana and Miguel sign in and land in the same organization as before, with the same dashboard and survey list.
3. **Deactivating in one organization only:** add a test membership for Ana in Leyinork by hand.
   - The switcher lists both organizations.
   - Switching changes the dashboard, surveys and users, and survives a reload.
   - Deactivating Ana in Acme hides Acme from her switcher. She can still sign in and use Leyinork.
4. **Tampered cookie:** `panda-org` set to an organization she doesn't belong to → falls back to her owned / oldest organization.
5. **Owner protection:**
   - Removing or deactivating Jordan (the owner) → `OWNER_PROTECTED`.
   - Doing it to yourself → `SELF_DEACTIVATE`.
   - Bulk with one invalid id → nothing changes.
6. **Remove from organization:** removing Marco from Acme takes him off the list, keeps his account (he can sign in, and lands nowhere until phase 2's `/welcome` exists), and keeps his surveys' "created by".
7. **Sign-up:** a new Google account and a new email registration still create their organization, now with `ownerId` and an owner membership.
8. **Code checks:**
   - `grep -rn "organizationId" src/lib/users src/server` shows no reads of `User.organizationId`.
   - `yarn lint` and `tsc` pass.

## References

- @docs/subscriptions.md
- @prisma/schema.prisma
- @prisma/seed.ts
- @src/lib/seed-data.ts
- @src/server/app-context.ts
- @src/server/auth-users.ts
- @src/lib/users/service.ts
- @src/lib/users/list.ts
- @src/actions/users.ts
- @src/components/layout/OrganizationSwitcher.tsx
- @src/components/layout/AppShellProvider.tsx
