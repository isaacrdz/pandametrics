# Subscriptions Phase 6 — Drop `User.organizationId` and `User.role`

## Overview

Phase 6 of 6 of plans and organizations. This is the "contract" step of the memberships change. Since phase 1 nothing reads or writes `User.organizationId` and `User.role`. This phase removes them from the database, the types and the seed, so the schema matches the overview.

There is no visible change. Full research: `docs/subscriptions.md` (sections 3.4, 3.5 and 10).

## Requirements

### Before the migration

- **No code reads or writes the columns:**
  - `grep -rn "organizationId" src --include=*.ts --include=*.tsx` must show only `Survey`, `SurveyResponse`, `Membership`, `Invitation` and scope uses, never a user's.
  - Same for `\.role\b` outside memberships and the `User` type's display field.
  - Fix any leftover first.
- **Stale values are expected.** The columns stopped being updated in phase 1, so users removed or added since then have outdated values. They carry no information that memberships lack, so they are dropped as they are. Every check below must use `Membership`, never these columns.

### Schema and migration

- **`prisma/schema.prisma`:**
  - Remove `User.role`, `User.organizationId`, the `User.organization` relation, `Organization.users` and the indexes `@@index([organizationId])` and `@@index([organizationId, isActive])` on `User`.
  - `Role` stays (used by `Membership`).
- **Migration:** `drop_user_organization`. Review that it only drops those columns and indexes.

### Types and code

- **`src/types/survey.ts`:**
  - `User` loses `organizationId`.
  - `role` stays as "role in the current organization", documented as filled from the membership.
  - If no component needs it outside the users list, move it to `UserRow` / the context instead.
- **Remove leftovers:**
  - The `app-context` literal tag, if any.
  - Comments that mention "a user belongs to one organization" (`app-context.ts`, `auth-users.ts`, `OrganizationSwitcher`).
  - `createUserWithOrganization`, if still around.
- **`context/project-overview.md`:** remove the note in section 5 that says the two columns are still in the database.

### Seed

- **`buildUsers`** no longer returns `organizationId` / `role`. Roles live only in the seeded memberships.
- **`seedOwner`** stops writing them.

## Testing

1. `npx prisma migrate dev` applies cleanly on the development branch. `prisma migrate status` is clean.
2. `npx prisma db seed` runs, and its counts are unchanged.
3. **Full pass:**
   - Sign in as Jordan, Ana, Valeria, Nora and Miguel.
   - Switch organizations.
   - Users list, deactivate / remove.
   - Invite and accept, plan seats.
   - Create and activate surveys within the plan limits.
   - Everything behaves as at the end of phase 5.
4. `yarn lint`, `tsc` and `next build` pass.

## References

- @docs/subscriptions.md
- @prisma/schema.prisma
- @prisma/seed.ts
- @src/lib/seed-data.ts
- @src/types/survey.ts
- @context/project-overview.md
