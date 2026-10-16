# Subscriptions Phase 5 — Business Plan

## Overview

Phase 5 of 6 of plans and organizations. The Business owner manages up to 3 members of their plan from Settings → Plan:

- invite existing users;
- see seats and pending invites;
- remove members.

A plan invite gives the person a seat (Pro through the owner's subscription) and a membership in the owner's organization. Accepting cancels the invitee's own Individual plan, after a warning. The phase also adds the renewal rules and the notice for members who leave the plan with a canceled Individual plan.

Email invites stay "coming soon". Full research: `docs/subscriptions.md` (sections 6.2, 6.3, 8.1, 8.2, 8.4 and 8.5).

## Decisions (from the research)

- **Plan invites:**
  - Only the Business owner sends them, with the plan live (`BUSINESS_REQUIRED`, `PRO_REQUIRED`).
  - The owner must own an organization (`OWNER_HAS_NO_ORGANIZATION`).
  - A plan invite is an `Invitation` with `subscriptionId`, so it also takes one of the organization's 3 slots.
- **Seats:** 3, counting pending plan invites (`SEAT_LIMIT`). Serialized by locking the `Subscription` row.
- **Cannot be invited** (`ALREADY_SUBSCRIBED`):
  - seat holders of any plan;
  - owners of a Business plan, live or expired.
- **Individual plan users can be invited:**
  - Accepting needs an explicit confirmation (`cancelIndividual: true`, otherwise `INDIVIDUAL_CANCEL_REQUIRED`).
  - It sets their Individual subscription to `CANCELED` (auto-renew off, `canceledAt`, `currentPeriodEnd` unchanged). Expired ones too.
- **Leaving the plan:** removing a member ends the seat and the membership in one transaction. So does a seat holder leaving the owner's organization, or being removed from it in `/users`. Invariant: a seat implies a membership.
- **After leaving:** a member whose canceled Individual plan is still running keeps Pro until its `currentPeriodEnd`, and sees a notice to renew it.
- **Renewal:**
  - Only the plan owner renews.
  - A Business owner with members or pending plan invites can only renew Business (`SEATS_IN_USE`).
  - While holding a seat, a user cannot renew or buy any plan (`IN_BUSINESS_PLAN`).
- **Expired plan:** members stay. Invites and plan changes are blocked; Remove still works.

## Requirements

### Service (`src/lib/plans/seats.ts`, extending `src/lib/invitations/service.ts`)

- **`createPlanInvitation(ownerId, email)`, in one transaction:**
  1. Lock `Subscription`, then the owner's `Organization`.
  2. The owner's own subscription must be `BUSINESS` → `BUSINESS_REQUIRED`, and live → `PRO_REQUIRED`.
  3. The owner must own an organization → `OWNER_HAS_NO_ORGANIZATION`.
  4. Then the phase 4 checks (`USER_NOT_FOUND`, `ALREADY_MEMBER`, `ALREADY_INVITED`, `INVITE_LIMIT`, `MEMBERSHIP_LIMIT`).
  5. The invitee must not hold a seat, nor own a Business subscription → `ALREADY_SUBSCRIBED`.
  6. Seats + pending plan invites must be under 3 → `SEAT_LIMIT`.
  7. Create the invitation with `subscriptionId`.
- **Already a member:** a person who is already a member of the owner's organization cannot get a seat through this flow (`ALREADY_MEMBER`).
- **`acceptInvitation`, plan invites:**
  1. Phase 4 checks, plus lock the `Subscription`.
  2. `ALREADY_SUBSCRIBED` again.
  3. If the user owns an `INDIVIDUAL` subscription and `cancelIndividual !== true` → `INDIVIDUAL_CANCEL_REQUIRED`, together with the plan's interval and `currentPeriodEnd` for the dialog.
  4. Create the membership + `SubscriptionSeat`. Set the Individual subscription to `status: CANCELED`, `canceledAt: now`.
  5. Invitation `ACCEPTED`.
- **`getInvitationPreview(userId, id)`:** tells the client before accepting whether an Individual plan will be canceled (type, interval, end date).
- **`removeSeat(ownerId, memberUserId)`:**
  1. Lock `Subscription`.
  2. Delete the seat (`NOT_FOUND`) and the membership in the owner's organization.
  3. Revoke pending invitations the member sent there.
  4. Create `MembershipEvent { REMOVED }`.
  - Allowed while expired.
- **Phase 4 functions:**
  - `leaveOrganization`: when the organization is the owner's organization of the user's seat, also deletes the seat.
  - `removeUsers`: when a removed user holds a seat in that organization owner's plan, deletes it too.
  - Both run in the same transaction.
- **`revokeInvitation`:** works for plan invites, by the Business owner.
- **Tags:** `subscription:{id}`, `user:{member}`, `org:{id}:users`, `org:{id}:invitations`.

### Renewal rules (`src/lib/plans/renewal.ts`)

- **`assertCanRenew(userId, planType)`:**
  - **Holds a seat:** `IN_BUSINESS_PLAN`, for any plan type.
  - **Switching to `INDIVIDUAL`** while the user's Business subscription has seats or pending plan invites → `SEATS_IN_USE` (the Subscription row is locked).
- **`scripts/data/set-plan.ts`:** calls it, and prints the code on refusal. `--force` skips it for support cases.
- **Settings → Plan:** shows the same rules (below). The real renew flow comes with the payment provider.

### Settings → Plan

- **Business owner: a "Members" card** below the plan summary:
  - **Header:** "Members · 2 of 3 seats".
  - **Member rows:** avatar, name, email, joined date, Remove. Remove opens a confirmation: "They will lose Pro and leave {organization}. Their surveys stay."
  - **Pending plan invites:** "Invited", expiry, Revoke.
  - **Invite form:** an email field, disabled when seats are full or the plan is expired, or with no organization. In that last case: a "Create your organization first" link to `/welcome`.
  - **`USER_NOT_FOUND`:** shows "Invitations by email — coming soon".
  - **Under the form:** a muted "Invite by email (coming soon)" row.
- **Business owner: plan options:**
  - Renew Business: coming soon.
  - "Switch to Individual": disabled while there are members or pending plan invites, with the hint "Remove your 2 members to switch to Individual".
- **Business member:** the read-only plan from phase 3. No renew or buy actions, plus the note "To get your own plan, leave {owner}'s Business plan first".

### Invitee and notices

- **`/invitations` and `/welcome`:**
  - Plan invites show "Business plan + {organization}".
  - Accept first calls the preview. With an Individual plan it opens a dialog:
    - *Live plan:* "Your Individual plan ({interval}, until {date}) will be canceled and will not renew. You will use Pro through {owner}'s Business plan."
    - *Expired plan:* "Your expired Individual plan will be canceled."
  - Confirming sends `cancelIndividual: true`. Without an Individual plan, accepting goes straight through.
- **Notice after leaving or removal:** `PlanExpiredBanner` (renamed `PlanNoticeBanner`) gets a variant, shown when the user has no seat and their own Individual subscription is `CANCELED` with `currentPeriodEnd > now`:
  - "Your Individual plan is canceled and ends on {date}. Renew it to keep using Pro features."
  - Renew plan: coming soon.
  - Shown in Settings → Plan too.
  - After the date passes, the expired-owner variant shows instead.
- **`/users`:** removing or leaving a seat holder's organization warns "This also removes them from {owner}'s Business plan".

### i18n

- **`plan.members.*`, `plan.renewal.*` and `invitations.plan*`:** the dialogs and the new error codes.
- **New codes:**
  - `BUSINESS_REQUIRED`
  - `OWNER_HAS_NO_ORGANIZATION`
  - `SEAT_LIMIT`
  - `ALREADY_SUBSCRIBED`
  - `INDIVIDUAL_CANCEL_REQUIRED`
  - `SEATS_IN_USE`
  - `IN_BUSINESS_PLAN`
- Both languages.

## Testing

1. **Seats (Jordan, Business, Ana and Sofía seated):**
   - Settings → Plan shows "2 of 3".
   - Inviting Emily (an Acme member) → `ALREADY_MEMBER`.
   - Inviting Nora → pending, "3 of 3". A further invite → `SEAT_LIMIT`.
   - Parallel invites at 2 of 3 → one created.
2. **Who cannot be invited:**
   - Ana (seat holder) → `ALREADY_SUBSCRIBED`.
   - A Business owner, live or expired: use `set-plan.ts` to give Miguel a Business plan → `ALREADY_SUBSCRIBED`.
3. **Accepting with an Individual plan:**
   - Give Nora an Individual monthly plan.
   - Accepting without confirming → the dialog. Posting the action without `cancelIndividual` → `INDIVIDUAL_CANCEL_REQUIRED`.
   - After confirming:
     - Nora is Pro via the seat (badge, no Renew).
     - She is a member of Acme.
     - Her subscription is `CANCELED` with its `currentPeriodEnd` unchanged.
   - With an expired Individual plan → also `CANCELED`.
4. **Renewal while seated:** `set-plan.ts --email nora… --type INDIVIDUAL` → `IN_BUSINESS_PLAN`.
5. **Removing a member:**
   - Jordan removes Nora: her seat and Acme membership are gone, `MembershipEvent REMOVED` exists, and her surveys stay in Acme.
   - She still has Pro until her Individual end date, with the "renew your Individual plan" notice.
   - Same after leaving Acme on her own instead.
   - Removing Sofía from `/users` also ends her seat.
6. **Switching to Individual:** with Ana and Sofía seated, `set-plan.ts --email jordan… --type INDIVIDUAL` → `SEATS_IN_USE`. After removing both and revoking pending invites → allowed.
7. **Expired Business plan:**
   - Members stay with the member banner.
   - The invite form is disabled and the actions return `PRO_REQUIRED`.
   - Remove still works.
8. **No organization:** a Business owner without an organization → `OWNER_HAS_NO_ORGANIZATION`, with the link to `/welcome`.
9. **Checks:** `yarn lint` and `tsc` pass.

## References

- @docs/subscriptions.md
- @context/features/subscriptions-phase-3-plans-spec.md
- @context/features/subscriptions-phase-4-invitations-spec.md
- @src/lib/invitations/service.ts
- @src/server/plans.ts
- @scripts/data/set-plan.ts
