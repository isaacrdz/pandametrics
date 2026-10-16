# Subscriptions Phase 4 — Organization Invitations

## Overview

Phase 4 of 6 of plans and organizations. Owners and admins of Pro organizations invite existing users into their organization. This phase covers:

- a limit of the owner plus 3 invited members;
- invites that expire after 14 days;
- accepting or declining in the app;
- members leaving an organization on their own.

Invitations by email, for people without an account, stay "coming soon". Business plan invites come in phase 5. Full research: `docs/subscriptions.md` (sections 6, 7.3 and 8.5).

## Decisions (from the research)

- **Who invites:**
  - The owner and the admins (active membership), while the owner's plan is Pro. Otherwise `PRO_REQUIRED`.
  - A `MEMBER` gets `FORBIDDEN`.
  - Admins invite against the owner's 3 slots.
- **What counts toward the 3:**
  - Members besides the owner, **including deactivated ones**.
  - Pending, unexpired invitations.
  - Expired invitations do not count.
- **Who can be invited:** any active account, including Individual plan users and Business members of other plans.
- **Serialization:**
  - Every create locks the organization row and then counts.
  - Every accept locks the invitee's user row (10-membership limit) and the organization.
- **An expired plan blocks** new invites and accepting pending ones (`PRO_REQUIRED`). Nothing else changes.
- **Leaving:**
  - Any member except the owner (`OWNER_CANNOT_LEAVE`).
  - The owner's email about it is pending (email feature). A `MembershipEvent` row keeps it for later.

## Requirements

### Schema and migration

- **New schema** (research 3.1):
  - `InvitationStatus` and `Invitation`, with `subscriptionId` / `email` / `token` nullable. They stay unused until phase 5 and the email feature.
  - `MembershipEventType` and `MembershipEvent`.
  - The relations on `Organization`, `User` and `Subscription`.
- **Migration:** `invitations`.

### Service (`src/lib/invitations/service.ts`)

- **`createInvitation(scope, email)`, in one transaction:**
  1. Lock `Organization`. The inviter must have an active `OWNER` / `ADMIN` membership → `FORBIDDEN`.
  2. The owner's tier must be `PRO` (`organizationTier`) → `PRO_REQUIRED`.
  3. Look up an active, non-deleted user by email → `USER_NOT_FOUND`.
  4. The invitee must not be already a member (or the inviter) → `ALREADY_MEMBER`.
  5. No pending, unexpired invite to this organization → `ALREADY_INVITED`.
  6. Members besides the owner + pending invites ≥ 3 → `INVITE_LIMIT`.
  7. The invitee must have fewer than 10 memberships → `MEMBERSHIP_LIMIT` (early feedback).
  8. Create the invitation, `expiresAt = now + 14 days` (`INVITATION_TTL_DAYS`).
- **Rate limit:** `createRateLimiter("invite")`, 20 per hour per inviter.
- **`acceptInvitation(userId, id)`:**
  1. The invitation must be `PENDING`, for this user, unexpired → `INVITE_NOT_FOUND` / `INVITE_EXPIRED`.
  2. Lock the user, then the organization.
  3. The owner's tier must still be `PRO` → `PRO_REQUIRED`.
  4. Memberships must be under 10 → `MEMBERSHIP_LIMIT`.
  5. Create the `MEMBER` membership, set the invitation to `ACCEPTED` and `respondedAt`.
  6. The action sets `panda-org` to that organization.
- **`declineInvitation`:** `DECLINED`.
- **`revokeInvitation(scope, id)`:** owner / admin, pending only → `REVOKED`.
- **`leaveOrganization(userId, organizationId)`:**
  1. The membership must exist → `NOT_FOUND`.
  2. An `OWNER` → `OWNER_CANNOT_LEAVE`.
  3. Delete the membership and create `MembershipEvent { LEFT }`.
- **`removeUsers` (phase 1):** also creates `MembershipEvent { REMOVED }` per removed user, and revokes pending invitations those users sent in that organization.
- **Tags:**
  - `user:{invitee}` and `org:{id}:users` on every change.
  - A new `org:{id}:invitations` for the pending list.
- **Actions:** `src/actions/invitations.ts`, with the same result shape as the other actions (`{ ok, data } | { ok: false, error, fieldErrors? }`).

### Users page (`/users`)

- **`InviteUserButton` becomes real:**

  | Viewer | Button |
  | --- | --- |
  | Owner / admin, organization on Pro | Opens the invite dialog; the label shows the slots used ("2 of 3") |
  | Owner / admin, Free or expired | "Pro feature" tooltip; the owner's tooltip links to `/settings/plan` |
  | Member | Hidden |

- **Invite dialog:**
  - An email field (Zod email), with submit and pending state.
  - `USER_NOT_FOUND` shows "This person has no account yet. Invitations by email are coming soon." No other way to invite them.
  - The other errors appear inline.
- **Pending invitations:**
  - Shown as rows above the members, with an "Invited" status pill, the expiry date and a Revoke action (owner / admin).
  - Not selectable for bulk actions.
  - Expired ones are hidden.
- **Users count:** members only.

### Invitee side

- **`/invitations`** (in `(app)`, uses `getAccountContext()`):
  - Heading "Invitations · count".
  - One row per pending, unexpired invitation: organization, inviter, date, expiry.
  - Accept / Decline.
  - The `MEMBERSHIP_LIMIT` message tells them to leave an organization first.
  - Empty state.
- **Sidebar user menu:** a "Invitations" item with a count badge when there are pending ones.
- **`/welcome`:** a "Pending invitations" card with the same rows, below "Create my organization". Accepting goes to `/dashboard` in that organization.
- **Proxy:** the matcher adds `/invitations`.

### Leave organization

- **Where:**
  - `OrganizationSwitcher`: a "Leave {organization}" item for the active organization when the user is not its owner.
  - `/settings/organization` comes later; the switcher is enough now.
- **Confirmation dialog:** "You will lose access to its surveys and metrics. Your surveys stay in the organization."
- **After leaving:** the cookie falls back (owned, oldest, then `/welcome`).

### i18n

- **New namespace `invitations`:** dialog, rows, statuses, accept / decline / revoke, leave dialog, every error code above. Plus `users.invite*`. Both languages.

## Testing

1. **The 3-slot limit (Jordan, Business = Pro):**
   - Invite Nora: the row is pending, "1 of 3".
   - Acme already has 7 members besides Jordan, so it is over the limit: every invite → `INVITE_LIMIT`.
   - Test the limit with Miguel's Leyinork promoted to Pro (`set-plan.ts`):
     - 3 invites work, the 4th fails.
     - Revoking one frees a slot.
     - Two parallel invites at 2 of 3 → only one is created.
2. **Accept and decline:**
   - Nora sees the badge, `/invitations` and the `/welcome` card.
   - Accepting puts her in Leyinork with Leyinork active.
   - Declining another invite removes it.
3. **Expiry:** an invite with `expiresAt` in the past is gone from both sides, frees the slot, and accepting it → `INVITE_EXPIRED`.
4. **Who can invite:**
   - An Acme admin (Ana) can invite and revoke; a member (Marco) does not see the button.
   - Free Leyinork, or an expired plan (Valeria's Panda Labs) → "Pro feature", and the action returns `PRO_REQUIRED`.
5. **Membership limit:** an invitee at 10 memberships cannot accept → `MEMBERSHIP_LIMIT`.
6. **Deactivated members:** deactivating a member keeps the slot taken; removing them frees it.
7. **Leaving:**
   - Nora leaves Leyinork: `MembershipEvent LEFT` exists, the slot is free, and she lands on her organization or `/welcome`.
   - Miguel has no "Leave" for Leyinork.
8. **Unknown email:** shows the "coming soon" message.
9. **Checks:** `yarn lint` and `tsc` pass.

## References

- @docs/subscriptions.md
- @src/lib/users/service.ts
- @src/components/layout/InviteUserButton.tsx
- @src/components/users/table/UsersTopBar.tsx
- @src/components/layout/OrganizationSwitcher.tsx
- @src/components/layout/NavUser.tsx
- @src/server/rate-limit.ts
- @src/proxy.ts
