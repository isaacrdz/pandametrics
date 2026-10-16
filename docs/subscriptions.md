# Subscriptions and Plan Limits — Free / Pro (Individual, Business)

Research for adding paid plans to Panda Metrics and enforcing each plan's limits: subscription data, memberships in several organizations, registration without an organization, in-app invitations, the Business plan's seats and the expired-plan behavior. Product rules: "Plans and limits" in `context/project-overview.md`.

Sources: `prisma/schema.prisma`, the two migrations, `prisma/seed.ts`, `src/lib/seed-data.ts`, `src/lib/surveys/service.ts`, `src/lib/surveys/constants.ts`, `src/server/app-context.ts`, `src/server/auth-users.ts`, `src/auth.ts`, `src/proxy.ts`, `src/app/(app)/layout.tsx`, the layout components (`OrganizationSwitcher`, `AppShellProvider`, `InviteUserButton`, `NavMain`), `src/lib/users/service.ts`, `src/actions/*.ts`, `docs/auth.md`, `docs/users.md`, and the Prisma docs (Context7 `/prisma/web`: partial indexes, `CHECK` constraints).

No payment provider and no prices exist yet. Everything below works with plans set by a script or the seed, and keeps optional provider columns for later.

---

## 1. Current state

### 1.1 Database

- `Organization`: `id`, `name`, `activeSurveyCount` (with the hand-added `CHECK ("activeSurveyCount" BETWEEN 0 AND 5)` in the `init` migration), dates. It does not record an owner.
- `User`: `role` (`OWNER` / `ADMIN` / `MEMBER`, default `MEMBER`) and `organizationId` (nullable, `onDelete: SetNull`) live **on the user**, so a user belongs to exactly one organization. `isActive` and `deletedAt` are global to the account.
- No plan, subscription, membership or invitation tables.
- Prisma is **7.10.1**. Partial indexes exist since 7.4 behind the `partialIndexes` preview feature. This design does not need them (section 3.3).

### 1.2 Active-survey limit

- `ACTIVE_SURVEY_LIMIT = 5` (`src/lib/surveys/constants.ts:30`), enforced only in `changeActiveCount` (`src/lib/surveys/service.ts:314-324`). It runs a guarded `updateMany … where activeSurveyCount <= LIMIT - delta`, so it is atomic and throws `ACTIVE_LIMIT`.
- Used by create, update, bulk activate / deactivate and bulk delete (`service.ts:341-433`).
- The UI reads the constant for its messages:
  - `PublishToggle.tsx:53` (inline error)
  - `SurveyForm.tsx:78`, `SurveysSelectionBar.tsx:42`, `SurveyActionsMenu.tsx:70` (toasts)
  - `SurveyActionsMenu.tsx:116` (the "x of 5 active" label)
- `activeCount` is passed down through `SurveysTableSection` and `DashboardSection`.
- `countActiveSurveys` (`service.ts:144`) is never called. The dashboard computes `activeSurveyCount` from the surveys it lists, not from the column.

### 1.3 Registration and sign-in

- Google sign-up: `adapter.createUser` → `createUserWithOrganization` (`src/server/auth-users.ts:27`). It creates an organization named after the user, and the user as its `OWNER`.
- Email / password sign-up: `registerOwner` (`auth-users.ts:127`), from `/register` (`RegisterForm`, `registerSchema.organizationName`) and `POST /api/v1/auth/register`. It also creates an organization plus an `OWNER`.
- `verifyCredentials` rejects a user without `organizationId` (`auth-users.ts:114`).

### 1.4 Acting user and organization

- `loadAppContext(userId)` (`src/server/app-context.ts:26`) is `"use cache"`, tagged `app-context` and `user:{id}`. It returns `null` for a deleted or inactive user, **and for a user without an organization**. `getAppContext` then redirects to sign-in. `organizations` is always `[organization]`.
- `(app)/layout.tsx` feeds `AppShellProvider` (`userName`, `organizations`, `currentOrganizationId`).
- `OrganizationSwitcher` only keeps the selection in local state ("until organizations come from the session").
- Every page and action takes `organization.id` from the context, never from the client (`actions/surveys.ts:28`, `actions/users.ts:28`). Every service scopes by it: surveys, users, dashboard, metrics, kiosk tags.
- `src/proxy.ts` only checks the session cookie, for `/dashboard`, `/surveys`, `/users` and `/profile`.

### 1.5 Roles and users

- No action checks `role`. The only role logic is `assertChangeAllowed` (`src/lib/users/service.ts:84-90`):
  - `SELF_DEACTIVATE`: you cannot deactivate or delete yourself.
  - `LAST_OWNER`: one active owner must remain.
- Deactivating from `/users` sets the **global** `User.isActive`. With several organizations, one organization's admin would lock that person out of all of them. It has to move to the membership (section 3.4).
- `InviteUserButton` is a "coming soon" button in `UsersTopBar`. `NavMain` has a disabled `settings` entry. There is no `/settings` route.

### 1.6 Cache tags

| Tag | Used for |
| --- | --- |
| `org:{id}:surveys` | Survey lists, form data, dashboard |
| `survey:{id}` | One survey |
| `org:{id}:users` | Users list |
| `user:{id}` | App context, `hasPassword` |
| `app-context` | Literal; nothing expires it |

---

## 2. Decisions

### 2.1 Where the plan lives: a `Subscription` model, one per paying user

**Recommended:** a separate `Subscription` table with `userId @unique` (the plan owner, who pays). Do not put plan columns on `User`.

- **Seats need a parent row.** Business members get Pro *from the owner's subscription*, so a member needs a row that points at that subscription. A `Subscription` row is that parent; plain columns on `User` would leave nothing to point at.
- **Provider data later** (customer id, subscription id, period dates) belongs together, and stays out of the user queries that run on every page (`USER_PUBLIC_SELECT`).
- **One row per owner, updated in place.** Renewing or changing the plan updates that row. A payment history table comes with the payment provider, not now.

### 2.2 `isPro` is derived, never stored

`isPro` depends on time (`currentPeriodEnd > now`). A stored boolean would need a scheduled job to flip it at the exact moment the period ends, and would be wrong between runs. So:

```ts
// src/lib/plans/plan.ts (shared, pure)
type PlanTier = "FREE" | "PRO" | "EXPIRED";

function subscriptionIsLive(s: { status: SubscriptionStatus; currentPeriodEnd: Date }, now: Date) {
  return s.status !== "INCOMPLETE" && s.currentPeriodEnd > now;
}
```

- `PRO`: the user's own subscription is live, **or** they hold a seat in a live Business subscription.
- `EXPIRED`: no live plan, but they own a subscription or hold a seat whose period ended. This is the state that shows the expired notice.
- `FREE`: no subscription and no seat.
- `isPro = tier === "PRO"`.

`CANCELED` means "canceled at period end": still Pro until `currentPeriodEnd`. `PAST_DUE` (payment failed, provider retrying) also stays Pro until `currentPeriodEnd`. "Expired" is not a status; it is `currentPeriodEnd <= now`, so nothing has to run when a period ends.

### 2.3 An organization gets its limits from its owner's plan

`Organization.ownerId` → the owner's effective plan (own subscription or Business seat; a seat member who owns an organization gives it Pro limits). Pro: 5 active surveys and 3 invites. Free or expired: 1 active survey, no invites.

### 2.4 Serializing the counted limits

Two counters work like the existing active-survey counter: a guarded `UPDATE` plus a `CHECK`. The other limits count rows that come and go (memberships, pending invitations, seats). For those, each transaction **locks the parent row first** (`SELECT … FOR UPDATE`), then counts and writes. Two concurrent requests on the same parent run one after the other, so the count cannot go over.

| Limit | Mechanism | Parent row locked |
| --- | --- | --- |
| Active surveys (1 / 5) | Guarded counter (existing) | Organization (by the `UPDATE`) |
| Organization invites (owner + 3) | Lock + count members and pending invites | Organization |
| Business seats (3) | Lock + count seats and pending plan invites | Subscription |
| Memberships (10 per user) | Lock + count memberships | User (the one joining) |
| One owned organization | `Organization.ownerId @unique` | — (constraint) |

With Prisma: `await tx.$queryRaw\`SELECT id FROM "Organization" WHERE id = ${id} FOR UPDATE\``, then the counts, inside the same `prisma.$transaction`.

---

## 3. Schema

### 3.1 New enums and models

```prisma
enum PlanType {
  INDIVIDUAL
  BUSINESS
}

enum BillingInterval {
  MONTHLY
  YEARLY
}

enum SubscriptionStatus {
  ACTIVE      // paid, renews
  CANCELED    // canceled at period end: Pro until currentPeriodEnd
  PAST_DUE    // last renewal failed, provider retrying: Pro until currentPeriodEnd
  INCOMPLETE  // first payment never completed (provider only): never Pro
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  DECLINED
  REVOKED
}

model Subscription {
  id                 String             @id @default(cuid())
  userId             String             @unique // the plan owner, who pays
  planType           PlanType
  billingInterval    BillingInterval
  status             SubscriptionStatus @default(ACTIVE)
  paidAt             DateTime?          // last successful payment
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime           // expiration: Pro until this instant
  canceledAt         DateTime?

  // Payment provider (none yet): kept optional so a provider can be added without a reshape
  provider               String?
  providerCustomerId     String?
  providerSubscriptionId String? @unique

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user        User               @relation(fields: [userId], references: [id], onDelete: Restrict)
  seats       SubscriptionSeat[]
  invitations Invitation[]
}

// A Business plan member: Pro through the owner's subscription. userId is unique, so a user
// holds at most one seat
model SubscriptionSeat {
  id             String   @id @default(cuid())
  subscriptionId String
  userId         String   @unique
  createdAt      DateTime @default(now())

  subscription Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([subscriptionId])
}

model Membership {
  id             String   @id @default(cuid())
  userId         String
  organizationId String
  role           Role     @default(MEMBER) // OWNER only for organization.ownerId
  isActive       Boolean  @default(true)   // deactivated in this organization only
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([userId, organizationId])
  @@index([organizationId, isActive])
}

model Invitation {
  id             String           @id @default(cuid())
  organizationId String
  invitedById    String
  userId         String?          // the invited account (in-app invites)
  email          String?          // email invites (later feature), lowercase
  token          String?          @unique // email invites (later feature), the link's secret
  subscriptionId String?          // set: a Business plan invite (seat + organization)
  status         InvitationStatus @default(PENDING)
  expiresAt      DateTime
  respondedAt    DateTime?
  createdAt      DateTime         @default(now())

  organization Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  invitedBy    User          @relation("InvitationsSent", fields: [invitedById], references: [id], onDelete: Cascade)
  user         User?         @relation("InvitationsReceived", fields: [userId], references: [id], onDelete: Cascade)
  subscription Subscription? @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  @@index([userId, status])
  @@index([organizationId, status])
  @@index([subscriptionId, status])
}

enum MembershipEventType {
  LEFT
  REMOVED
}

// Who left or was removed, kept for the owner's email (email feature, pending)
model MembershipEvent {
  id             String              @id @default(cuid())
  organizationId String
  userId         String
  type           MembershipEventType
  notifiedAt     DateTime?           // set once the email is sent
  createdAt      DateTime            @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([organizationId, createdAt(sort: Desc)])
}
```

### 3.2 Changes to existing models

```prisma
model Organization {
  // …existing fields
  ownerId String @unique // one owned organization per user; one owner per organization

  owner       User         @relation("OwnedOrganization", fields: [ownerId], references: [id], onDelete: Restrict)
  memberships Membership[]
  invitations Invitation[]
}

model User {
  // …existing fields; organizationId and role are dropped in the last phase (section 10)
  ownedOrganization   Organization?     @relation("OwnedOrganization")
  memberships         Membership[]
  subscription        Subscription?
  seat                SubscriptionSeat?
  invitationsSent     Invitation[]      @relation("InvitationsSent")
  invitationsReceived Invitation[]      @relation("InvitationsReceived")
}
```

### 3.3 Why `Organization.ownerId @unique` and not a partial index

A single unique column gives both rules with a plain constraint, with no preview feature:

- a user owns **at most one** organization (unique `ownerId`);
- an organization has **exactly one** owner (non-null column), so "the owner's plan" is one join: `organization → owner → subscription | seat → subscription`.

The owner also has a `Membership` with `role = OWNER`, so lists, the switcher and the 10-membership count treat everyone alike. Invariant: `membership.role = OWNER` ⇔ `organization.ownerId = membership.userId`. Both rows are written only by "create organization", in one transaction. There is no ownership transfer.

The alternative (`@@unique([userId], where: { role: OWNER })` on `Membership`) needs `previewFeatures = ["partialIndexes"]`. It still leaves "exactly one owner per organization" to a second partial index. Not worth a preview flag.

### 3.4 Memberships replace `User.organizationId` / `User.role`

- **Role and deactivation per organization:**
  - Role moves to `Membership.role`.
  - Deactivating a user from `/users` sets `Membership.isActive`, no longer `User.isActive`, so it only affects that organization.
  - `User.isActive` and `deletedAt` stay as account-level switches, used only by scripts and support.
- **The owner is protected:** `LAST_OWNER` becomes `OWNER_PROTECTED`, because the owner's membership can never be deactivated or removed. `SELF_DEACTIVATE` stays.
- **"Delete" in `/users` removes the membership:**
  - The account and its surveys stay, and `Survey.createdById` keeps "created by".
  - The person leaves that organization only.
  - Today's soft delete of the user becomes "remove from organization".
- **No unique-email rule changes:** `email` stays unique per account.

### 3.5 Migration and backfill

One migration (`npx prisma migrate dev --create-only --name subscriptions_memberships`), reviewed and edited before it is applied:

1. Create the enums and the `Subscription`, `SubscriptionSeat`, `Membership` and `Invitation` tables. They start empty, so **every existing user starts on Free**.
2. Add `Organization.ownerId` **nullable** and backfill it with the oldest `OWNER` user of each organization:
   ```sql
   UPDATE "Organization" o SET "ownerId" = (
     SELECT u.id FROM "User" u
     WHERE u."organizationId" = o.id AND u.role = 'OWNER' AND u."deletedAt" IS NULL
     ORDER BY u."createdAt" LIMIT 1);
   ```
   Then `ALTER COLUMN "ownerId" SET NOT NULL` and the unique index. Before applying, check on Neon that every organization has an owner (`SELECT id FROM "Organization" WHERE "ownerId" IS NULL`). Every organization created by sign-up has one. Only seed data may not (section 9).
3. Backfill memberships from the users:
   ```sql
   INSERT INTO "Membership" (id, "userId", "organizationId", role, "isActive", "createdAt", "updatedAt")
   SELECT gen_random_uuid()::text, u.id, u."organizationId",
          CASE WHEN o."ownerId" = u.id THEN 'OWNER'::"Role"
               WHEN u.role = 'OWNER' THEN 'ADMIN'::"Role"  -- a second owner becomes admin
               ELSE u.role END,
          u."isActive", u."createdAt", now()
   FROM "User" u JOIN "Organization" o ON o.id = u."organizationId"
   WHERE u."deletedAt" IS NULL;
   ```
   Then `UPDATE "User" SET "isActive" = true WHERE "deletedAt" IS NULL`: deactivating from `/users` used to set the account's flag, and it now lives in the membership, so a member reactivated in their organization must be able to sign in again.
4. Keep `CHECK ("activeSurveyCount" BETWEEN 0 AND 5)`: 5 is the Pro maximum, and the per-plan limit lives in the service. Add `CHECK ("currentPeriodEnd" > "currentPeriodStart")` on `Subscription`.
5. `User.organizationId` and `User.role` are **not** dropped here. The code moves to memberships first. A later migration drops them, once nothing reads them (expand and contract, section 10).

---

## 4. Effective plan and app context

### 4.1 Resolving the plan

```ts
// src/server/plans.ts
interface PlanState {
  tier: "FREE" | "PRO" | "EXPIRED";
  planType: PlanType | null;          // INDIVIDUAL / BUSINESS when there is a subscription
  source: "OWN" | "SEAT" | null;      // own subscription or a Business seat
  isPlanOwner: boolean;               // pays (OWN) → may renew, manage seats
  currentPeriodEnd: Date | null;
  subscriptionId: string | null;      // the live (or last) subscription it comes from
}
```

- **A seat wins over an own subscription.** A Business member's own Individual plan was canceled when they joined (section 6.3), so while they hold a seat the plan comes from the seat, and they never see "Renew plan" (`isPlanOwner: false`).
- **Without a seat:** a live own subscription gives `PRO`. If there is one but it is not live, the result is `EXPIRED`, and its owner sees "Renew plan".
- **`canceledIndividual`:** `PlanState` also carries the user's own Individual subscription (status and `currentPeriodEnd`) when it is `CANCELED`. The removal notice uses it (section 8.2).

### 4.2 Plan limits

```ts
// src/lib/plans/limits.ts (shared by client and server)
export const PLAN_LIMITS = {
  FREE: { activeSurveys: 1, invites: 0 },
  PRO: { activeSurveys: 5, invites: 3 },
} as const;
export const BUSINESS_SEATS = 3;
export const MAX_MEMBERSHIPS = 10;
export const INVITATION_TTL_DAYS = 14;

export const limitsFor = (tier: PlanTier) => (tier === "PRO" ? PLAN_LIMITS.PRO : PLAN_LIMITS.FREE);
```

`ACTIVE_SURVEY_LIMIT` disappears. Every message takes the limit from the context (`limits.activeSurveys`) instead of the constant.

### 4.3 App context

Two layers, because a user without an organization can now be signed in:

```ts
interface AccountContext {
  user: User;
  plan: PlanState;                         // the user's own plan (badge, Settings → Plan, notice)
  memberships: { organization: Organization; role: Role; isActive: boolean }[];
  ownsOrganization: boolean;               // false → may create one
  pendingInvitations: number;
}

interface AppContext extends AccountContext {
  organization: Organization;              // the active organization
  role: Role;                              // in the active organization
  organizationPlan: PlanState;             // the owner's plan: the organization's limits
  limits: { activeSurveys: number; invites: number };
}
```

- **`getAccountContext()`** gives the signed-in user, or a redirect to `/sign-in`. It is used by `/welcome`, `/invitations`, `/settings`, `/profile` and the expired banner.
- **`getAppContext()`** builds on the account context and also needs an active organization. Without one it redirects to `/welcome`, and server actions get `NO_ORGANIZATION` (section 7.1). Every organization-scoped page and action uses it.
- **Active organization:**
  - Stored in an `httpOnly` cookie `panda-org` with the organization id.
  - Valid only when the user has an **active membership** there.
  - Otherwise the user lands in the organization they own, then the oldest active membership, then none.
  - Switching is a Server Action (`switchOrganization(id)`). It checks the membership, sets the cookie and calls `refresh()`.
  - `OrganizationSwitcher` calls that action instead of keeping local state, and lists `memberships`.
- **Caching:**
  - `loadAccount(userId)` stays `"use cache"` and is tagged `user:{id}` plus `subscription:{id}` for each subscription it read (own or seat).
  - It returns the **raw rows** (subscription status and dates, memberships), never a computed `isPro`.
  - The tier is computed **outside** the cache with the request's `new Date()`. A cached `PRO` therefore turns `EXPIRED` the moment the period ends, with no cache invalidation.
  - Service checks (activation, invites, seats) always read the database inside their transaction and never trust the context.

### 4.4 Tags to expire

| Change | Tags |
| --- | --- |
| Subscription created / renewed / expired by script | `subscription:{id}`, `user:{ownerId}` |
| Seat added / removed | `subscription:{id}`, `user:{memberId}` |
| Membership added / removed / deactivated | `user:{userId}`, `org:{id}:users` |
| Invitation created / answered / revoked | `user:{invitedUserId}`, `org:{id}:invitations`, `subscription:{id}` when it is a plan invite |
| Organization created | `user:{ownerId}` |

The literal `app-context` tag can go. Nothing expires it, and `user:{id}` covers it.

---

## 5. No organization after sign-up

### 5.1 Registration

- `registerSchema` loses `organizationName`. `RegisterForm`, `POST /api/v1/auth/register` and the i18n keys follow.
- `registerOwner` becomes `registerUser`, which creates the user only, with no organization and no role.
- `adapter.createUser` (Google) creates the plain user (the default Prisma adapter is enough). `createUserWithOrganization` is deleted.
- `verifyCredentials` drops the `!user.organizationId` condition, because an account without an organization can sign in.
- The rest of `canSignIn` stays the same.
- A user created from an email invite (later feature) also gets no organization of its own (project overview). The invite only adds the membership and the seat.

### 5.2 `/welcome` (onboarding)

A new route in its own group, `(onboarding)/welcome`, with a minimal layout (logo, user menu with sign out, language and theme), no sidebar.

- **Create my organization card:**
  - A name field (`ORGANIZATION_NAME_MAX = 80`, moved from `auth/schema.ts` to `lib/organizations/schema.ts`).
  - Shown only while `ownsOrganization` is false.
- **Pending invitations card:** the invitations listed with Accept / Decline (section 6.4).
- **After creating or accepting**, the user goes to `/dashboard` with that organization active.
- **Who goes there:**
  - A user without any active membership is redirected to `/welcome` by `getAppContext`.
  - A user who has memberships can still open `/welcome` from the switcher ("Create organization", while they own none).

### 5.3 Create organization

`createOrganization(name)` Server Action → service:

```
transaction:
  lock User row (FOR UPDATE)
  if an organization with ownerId = user exists → OWNER_LIMIT
  if memberships(user) >= 10 → MEMBERSHIP_LIMIT
  create Organization { name, ownerId: user }
  create Membership { role: OWNER }
set panda-org cookie, expire user:{id}
```

The `ownerId` unique constraint is the database backstop. Map `P2002` on `ownerId` to `OWNER_LIMIT`. Business seat members may create one too: their seat does not count as ownership.

### 5.4 Routes and proxy

`src/proxy.ts` matcher adds:

- `/welcome`
- `/invitations`
- `/settings/:path*`

The proxy still checks only the cookie. `getAccountContext` / `getAppContext` do the real checks.

| Route | Needs organization | Context |
| --- | --- | --- |
| `/welcome`, `/invitations`, `/profile`, `/settings/plan` | No | `getAccountContext` |
| `/dashboard`, `/surveys/**`, `/users/**`, `/settings/organization` | Yes | `getAppContext` |

`/profile` and `/settings` sit in the `(app)` group today. With a `null` organization, the `(app)` layout renders the sidebar without the organization switcher, and its organization-only items (Dashboard, Surveys, Users) link to `/welcome`. The alternative is to move `/profile` out of the group. **Recommended:** the `(app)` layout uses `getAccountContext` and passes an optional organization, and organization pages call `getAppContext` themselves. They already call it.

---

## 6. Invitations (in-app, existing accounts)

### 6.1 Who can invite

- **Organization invite:**
  - The organization's owner **and its admins** (active membership with role `OWNER` or `ADMIN`), while `organizationPlan.tier === "PRO"`. Otherwise `PRO_REQUIRED`; a `MEMBER` gets `FORBIDDEN`.
  - The limit is the owner's plan in both cases: an admin invites against the same 3 slots.
  - Any existing user can be invited, including Individual plan users and Business members of another plan.
- **Plan invite (Business):**
  - The Business plan owner (`plan.source === "OWN"`, `planType === "BUSINESS"`, tier `PRO`).
  - The owner must own an organization, because the invite adds the person to it. Otherwise `OWNER_HAS_NO_ORGANIZATION`, with a link to create one.

### 6.2 Creating an invite

Input: the invitee's email (exact match, lowercase) and, for a plan invite, nothing else. The plan invite targets the owner's organization and subscription.

```
transaction:
  lock Organization (FOR UPDATE)
  if subscription invite: lock Subscription (FOR UPDATE)
  inviter is OWNER / ADMIN, active membership  → FORBIDDEN
  resolve organizationPlan from the DB         → PRO_REQUIRED
  invitee = active, not deleted user by email  → USER_NOT_FOUND (UI: "email invites coming soon")
  invitee is the inviter / already a member    → ALREADY_MEMBER
  pending, unexpired invite to this org exists → ALREADY_INVITED
  members(org, excluding owner) + pending invites(org) >= 3 → INVITE_LIMIT
  plan invite:
    invitee holds a seat, or owns a Business subscription (live or expired) → ALREADY_SUBSCRIBED
    (an Individual plan, live or expired, does not block: it is canceled on accept, section 6.3)
    seats(sub) + pending plan invites(sub) >= 3      → SEAT_LIMIT
  memberships(invitee) >= 10 → MEMBERSHIP_LIMIT (early feedback; checked again on accept)
  create Invitation { organizationId, invitedById, userId, subscriptionId?, expiresAt: now + 14 days }
```

What counts:

- **Pending invites** count toward both limits (owner + 3, and 3 seats). Expired ones (`expiresAt < now`) do not.
- **Deactivated members** count toward the organization's 3 (decided): they still hold the slot until they are removed or leave.
- A **plan invite** is also an organization invite (same row), so a seat always uses one of the organization's 3 slots.
- `USER_NOT_FOUND` reveals that an email has no account. That is accepted for invites inside the app. Only signed-in Pro owners can reach it, and it is rate limited (`createRateLimiter`, 20 per hour per inviter).

### 6.3 Accepting

```
transaction:
  invitation PENDING, not expired, invitation.userId = me → INVITE_NOT_FOUND / INVITE_EXPIRED
  lock User (me), lock Organization, lock Subscription if plan invite
  organizationPlan still PRO (owner's plan live)          → PRO_REQUIRED
  memberships(me) >= 10                                   → MEMBERSHIP_LIMIT
  plan invite: I hold a seat or own a Business plan (any status) → ALREADY_SUBSCRIBED
  plan invite: my own INDIVIDUAL subscription exists (live or expired) and
               the client did not send cancelIndividual: true → INDIVIDUAL_CANCEL_REQUIRED
  create Membership { role: MEMBER } (a removed member has no row left, so re-joining creates it again)
  plan invite:
    create SubscriptionSeat
    my INDIVIDUAL subscription → status CANCELED, canceledAt now (currentPeriodEnd unchanged)
  invitation → ACCEPTED, respondedAt
set panda-org to that organization, expire tags (user:{me}, subscription:{mine}, subscription:{business})
```

The limits were reserved by the pending invite, so they are not counted again.

**Joining a Business plan with an Individual plan:**

- **Warning before accepting:** before accepting a plan invite, the service checks whether the invitee has an Individual subscription. If so, the accept dialog warns:
  > "Your Individual plan ({interval}, until {date}) will be canceled and will not renew. You will use Pro through {owner}'s Business plan."
  >
  > With an expired plan: "Your expired Individual plan will be canceled."
- **Confirmation is enforced on the server:** only the confirmation sends `cancelIndividual: true`. The server refuses without it (`INDIVIDUAL_CANCEL_REQUIRED`), so the cancellation is never silent.
- **What cancelling does:**
  - It turns auto-renew off, setting `status: CANCELED` and `canceledAt`. Nothing is refunded and the paid period is kept.
  - The payment provider (later) gets "cancel at period end" for the same subscription.
- **Expired Individual plans are canceled the same way.** They would not renew anyway, but `CANCELED` records that the user moved to a Business plan. Decline sets `DECLINED`. The owner can **revoke** a pending invite (`REVOKED`), which frees the slot.

### 6.4 Where the invitee sees them

- **A badge** with the pending count in the sidebar user menu ("Invitations (2)"), linking to `/invitations`.
- **`/invitations`:**
  - A list with organization name, inviter, kind ("Organization" or "Business plan + organization") and expiry.
  - Accept / Decline buttons. A plan invite to a user with an Individual plan opens the cancellation warning before accepting (section 6.3).
  - The `MEMBERSHIP_LIMIT` message explains that they must leave an organization first.
- **On `/welcome`**, the same list (section 5.2).

### 6.5 Email invites: room left, nothing sent

- `Invitation.email` and `token` stay `null` in this feature.
- In the invite form, an email with no account shows "This person has no account yet. Invite by email — coming soon", with the same muted style and tooltip as `InviteUserButton`.
- The later feature fills `email` + `token`, sends the link to `/register?invite=<token>`, and on registration adds the membership and the seat with no own organization. The accept logic is the same as section 6.3.

### 6.6 Users page

`InviteUserButton` becomes real:

| Viewer | Button |
| --- | --- |
| Owner or admin, organization on Pro | Opens an invite dialog (email); shows "2 of 3" |
| Owner or admin, organization on Free | "Pro feature" tooltip; the owner also gets the upgrade link (coming soon) |
| Owner or admin, owner's plan expired | Same as Free |
| Member | Hidden |

The users list reads memberships, and shows pending invitations as rows with the status "Invited" and a Revoke action.

---

## 7. Validations by action

### 7.1 Survey creation requires an organization

- **`createSurvey` action:** gets the context through a non-redirecting variant (`getSessionAppContext()` → `AppContext | null`). With no active organization it returns `{ ok: false, error: "NO_ORGANIZATION" }`. The client then shows a toast and `router.push("/welcome")`.
- **The service:** requires a `SurveyScope` with an organization the user has an **active membership** in. It checks again inside the transaction, so a removed member cannot create.
- **`/surveys/new`:** calls `getAppContext()`, so it redirects to `/welcome` with no organization. Today the page itself does no check (the layout does).
- **"New survey" buttons** (`NewSurveyButton`, `CreateSurveyCallout`, the empty-list CTA): only rendered inside organization pages, so they never show without one. The action check is the guarantee.
- **Applies on every plan.** Free and Pro alike.

### 7.2 Active surveys per plan

`changeActiveCount(tx, organizationId, delta)` reads the limit inside the transaction:

```ts
const limit = limitsFor(await organizationTier(tx, organizationId, now)).activeSurveys; // 1 or 5
const { count } = await tx.organization.updateMany({
  where: { id: organizationId, activeSurveyCount: { lte: limit - delta } },
  data: { activeSurveyCount: { increment: delta } },
});
if (count === 0) throw new SurveyServiceError("ACTIVE_LIMIT");
```

- **Downgrade:**
  - An organization with 4 active surveys that drops to Free keeps them, since a delta of 0 or a negative delta always passes.
  - Editing an active survey still works.
  - Activating another fails until the count is below 1 or Pro is back.
- **`ACTIVE_LIMIT`:** the error carries the limit and the tier, so the messages can say "Free plan: 1 active survey. Upgrade to Pro for 5" vs. "Pro plan: 5 active surveys".
- **"x of N active"** in `SurveyActionsMenu` uses `limits.activeSurveys`.

### 7.3 Summary

| Rule | Runs in | Error | HTTP |
| --- | --- | --- | --- |
| Organization required to create a survey | `createSurvey` action + service | `NO_ORGANIZATION` | 409 |
| Active surveys 1 / 5 | survey service (`changeActiveCount`) | `ACTIVE_LIMIT` | 409 |
| Invites need Pro | invitation service | `PRO_REQUIRED` | 403 |
| Owner + 3 members (pending count) | invitation service, locks Organization | `INVITE_LIMIT` | 409 |
| 3 Business seats (pending count) | invitation service, locks Subscription | `SEAT_LIMIT` | 409 |
| No seat and no own Business plan (live or expired) to join a Business plan | invite + accept | `ALREADY_SUBSCRIBED` | 409 |
| Individual plan must be canceled (confirmed) to join | accept | `INDIVIDUAL_CANCEL_REQUIRED` | 409 |
| No Individual (or any own plan) while holding a seat | renewal / purchase service, `set-plan.ts` | `IN_BUSINESS_PLAN` | 409 |
| Plan invites need a Business owner | invitation service | `BUSINESS_REQUIRED` | 403 |
| Business owner must own an organization | invitation service | `OWNER_HAS_NO_ORGANIZATION` | 409 |
| One owned organization | `createOrganization` + unique `ownerId` | `OWNER_LIMIT` | 409 |
| 10 memberships | create organization, invite (early), accept (authoritative) | `MEMBERSHIP_LIMIT` | 409 |
| Invite lookup | invitation service | `USER_NOT_FOUND`, `ALREADY_MEMBER`, `ALREADY_INVITED`, `INVITE_NOT_FOUND`, `INVITE_EXPIRED` | 404 / 409 |
| Owner cannot be deactivated / removed | users service | `OWNER_PROTECTED` (replaces `LAST_OWNER`) | 409 |
| Only owner / admin invites into the organization | invitation service | `FORBIDDEN` | 403 |
| Owner cannot leave their organization | membership service | `OWNER_CANNOT_LEAVE` | 409 |
| Switch Business → Individual only without members | renewal service / `set-plan.ts`, locks Subscription | `SEATS_IN_USE` | 409 |

Zod validates the inputs: an email for invites, an organization name, and ids as strings. The limits are never checked in Zod, because they need the database.

---

## 8. Business plan: Settings → Plan, removal and expiration

### 8.1 `/settings`

- The `settings` entry in `NavMain` becomes enabled.
- `/settings` redirects to `/settings/plan`. Tabs:
  - **Plan:** every user.
  - **Organization:** rename; comes later, its own feature.
- **What Plan shows, by viewer:**
  - **Free:**
    - "Free plan" with its limits (1 active survey, no invites).
    - Individual and Business cards with "Upgrade — coming soon".
  - **Individual owner:** plan, interval, last payment, renews / expires on, and the "Renew plan" button when expired.
  - **Business owner:**
    - The same summary, plus the **Members** card:
      - Seats used / available ("2 of 3").
      - A list of members (avatar, name, email, joined date, Remove).
      - Pending plan invites (Revoke).
      - The invite form (existing account email).
      - The "invite by email — coming soon" note.
    - While expired: the list is read-only except Remove, and the invite form is disabled.
  - **Business member:** "You are on {owner}'s Business plan" with the expiry, read-only, no payment action.

### 8.2 Removing a member from the plan

`removeSeat(memberUserId)` (Business owner only):

```
transaction:
  lock Subscription
  delete SubscriptionSeat (member, this subscription)   → NOT_FOUND
  delete Membership (member, owner's organization)
  revoke pending invitations the member sent in that organization (they may be an admin)
  create MembershipEvent { type: REMOVED } (for the email feature, section 8.5)
expire subscription:{id}, user:{member}, org:{ownerOrg}:users
```

- **Surveys stay** with the organization (`Survey.organizationId`), and "created by" keeps pointing at the account.
- **The member's active organization:** if it was the owner's organization, their `panda-org` cookie is invalid on the next request. `getAppContext` falls back to their own organization or another membership, or to `/welcome`. A Server Action of theirs in flight gets `NOT_FOUND` / `NO_ORGANIZATION`.
- **Removed from the organization, not the plan:**
  - The owner removes a seat holder from `/users` instead.
  - Recommended: also end the seat, keeping the invariant "a seat implies a membership in the owner's organization".
  - The `/users` dialog warns "This also removes them from your Business plan".
- **Expiration never removes anyone** (section 8.3).
- **A removed member who had an Individual plan:** their own Individual subscription stays `CANCELED`.
  - **If its `currentPeriodEnd` has not passed:**
    - They keep Pro until that date, the period they already paid for.
    - A notice (banner and Settings → Plan) says "You left {owner}'s Business plan. Your Individual plan is canceled and ends on {date}. Renew it to keep using Pro features."
    - "Renew plan" turns auto-renew back on (`status: ACTIVE`, `canceledAt: null`). It shows as coming soon until there is a provider.
  - **If the period has passed:** the usual expired-owner notice with "Renew plan".
  - **Leaving on their own** (section 8.5) gives the same notice.

### 8.3 Expiration

No job runs. The tier turns `EXPIRED` when `currentPeriodEnd` passes (section 2.2).

- **Blocked while expired, for the owner and every member:**
  - Activating surveys above the Free limit: the organizations they own get the Free limit (1).
  - New organization or plan invites (`PRO_REQUIRED`).
  - Accepting pending invites to their organizations (`PRO_REQUIRED`).
  - Plan changes, except Remove.
- **Kept:**
  - Surveys already active stay active and keep collecting responses.
  - Members stay in the plan and the organization.
  - Metrics, editing and deactivating work as usual.
- **Notice:** a `PlanExpiredBanner` at the top of `SidebarInset`, above each page's top bar, rendered from `AccountContext.plan`:
  - **Business member:** "{owner}'s Business plan expired on {date}. Pro features are paused until it is renewed." No action.
  - **Plan owner** (Individual or Business): "Your {Individual | Business} plan expired on {date}. Pro features are paused." Plus a **Renew plan** button. Until there is a payment provider it is muted with a "Coming soon" tooltip, like `InviteUserButton`. Later it links to the checkout.
  - The banner can be dismissed for the session (`sessionStorage`), but it returns on the next visit. Settings → Plan shows the same message permanently.
- **Renewal:**
  - It updates the owner's `Subscription` (`status: ACTIVE`, new period, `paidAt`) and expires `subscription:{id}`.
  - Every member's cached context carries that tag, so the whole plan unlocks at once.
  - Until the provider exists, renewal is done with the script in section 9.

### 8.4 Renewal and changing plan type

Renewing is done by the plan owner only (members never pay). The type that can be renewed depends on the Business members:

- **Business owner with members** (seats > 0, or pending plan invites): can renew **Business only**. Renewing or switching to Individual is rejected with `SEATS_IN_USE` until they remove every member and revoke the pending plan invites.
- **Business owner without members:** can renew Business or switch to Individual.
- **Individual owner:** can renew Individual or switch to Business.
- **Business member (holds a seat):** cannot renew or buy an Individual plan (`IN_BUSINESS_PLAN`). Settings → Plan hides those actions and explains that they first have to leave the Business plan. They cannot buy a Business plan of their own either (recommended, same reason).

Settings → Plan shows the rule next to the Individual option ("Remove your 2 members to switch to Individual"). The check runs in the renewal service with the Subscription row locked, so a plan invite accepted at the same time cannot slip in. Until there is a payment provider, `set-plan.ts` applies the same check.

### 8.5 Leaving an organization

Any member (`ADMIN` or `MEMBER`) can leave an organization on their own: "Leave organization" in the organization switcher, and in `/settings/organization`, with a confirmation dialog.

```
transaction:
  membership exists                    → NOT_FOUND
  role = OWNER                         → OWNER_CANNOT_LEAVE (an owner never leaves their organization)
  delete Membership
  if the organization is their Business plan owner's organization: delete their SubscriptionSeat
expire user:{me}, org:{id}:users, subscription:{id} when a seat ended
```

- **Leaving the plan owner's organization also ends the seat**, so the member loses Pro from that plan. Same invariant as removal (section 8.2). The dialog says so: "You will also leave {owner}'s Business plan".
- **Slot freed:** the slot in the organization (and the seat) is freed at once.
- **Their surveys stay** with the organization.
- **Their active organization:** they land in their own organization, another membership, or `/welcome`.
- **Email to the owner (pending):** the owner should get an email saying who left. It is part of the email feature, which is not in the project yet. Until then, keep a `MembershipEvent` row (`organizationId`, `userId`, `type: LEFT | REMOVED`, `createdAt`) so the email feature can send it, or show it later as an in-app notification.

### 8.6 Plan badge

- **Sidebar user block (`NavUser` / `SidebarUser`):** a small "Pro" (accent) or "Free" (muted) pill next to the name, and "Expired" (destructive-muted) when expired.
- **Profile picture card:** the same badge, plus the plan name.
- **Upgrade states:** "Pro feature" tooltips on Invite, and the limit messages, link to `/settings/plan`.

---

## 9. Seed and manual plans

- **Without a provider**, plans are set by a versioned data script, `scripts/data/set-plan.ts --email … --type BUSINESS --interval YEARLY [--expired]`. It upserts the owner's `Subscription` with a period from today. It is reviewed, committed, and run on a Neon branch first, following the project's data-change policy. No admin UI for now.
- **Seed (`prisma/seed.ts`, `src/lib/seed-data.ts`):**
  - **Acme Inc.:** owner Jordan, with a **Business** plan, monthly and active. Seats: Ana and Sofía (2 of 3, so an invite can be tried). Memberships for the 8 Acme users, roles as today. Acme already has 4 active surveys, within Pro's 5.
  - **Panda Labs:** has no users today, but `ownerId` is required. Add an owner with an **expired Individual** plan, to see the owner banner and the Free limit with surveys already active above it.
  - **A user without an organization**, with one pending invitation to Acme, to try `/welcome` and accept.
  - **Leyinork (Miguel):** stays Free, the real default. Promote it with the script when needed.
  - The seed's delete step adds `subscriptionSeat`, `subscription`, `invitation` and `membership` before `user` and `organization`. The counts log adds plans and memberships.
- **Cleanup:** `createUserWithOrganization` and the "organization-less user" rejections disappear from `auth-users.ts`. `docs/auth.md` section 4.1 (open sign-up creates an organization) is superseded by this document.

---

## 10. Phases

Each phase is shippable on its own and ends with `yarn lint`, `tsc` and the checks listed.

1. **Memberships and ownership** (no visible change, except a working switcher):
   - Migration from section 3.5.
   - Code reads `Membership`: app context, users list and actions (`Membership.isActive`, `OWNER_PROTECTED`, remove instead of delete).
   - Active organization cookie and `switchOrganization`.
   - Seed.
   - *Verify:* every existing user lands in the same organization. The users list is unchanged. Deactivating in one organization does not lock the account.
2. **Registration without an organization:**
   - `registerUser`, Google `createUser`, `registerSchema` without the organization field.
   - `/welcome` with "Create my organization", `createOrganization` (`OWNER_LIMIT`, `MEMBERSHIP_LIMIT`).
   - `getAccountContext` / `getAppContext` split, proxy matcher, `NO_ORGANIZATION` on `createSurvey`.
   - *Verify:* a new Google account and a new email account land on `/welcome`. `/surveys/new` and the action reject without an organization. A second "create organization" fails even with two parallel requests.
3. **Subscriptions and plan limits:**
   - `Subscription` / `SubscriptionSeat` tables, `PlanState`, `PLAN_LIMITS`.
   - `changeActiveCount` per plan, messages with the plan's limit.
   - Plan badge, `PlanExpiredBanner` (Renew coming soon), `/settings/plan` summary, `set-plan.ts`, seed plans.
   - *Verify:*
     - A Free organization activates 1 survey and fails at 2, including with parallel requests. Pro allows 5.
     - When a period ends (set `currentPeriodEnd` to now + 1 min), the banner shows and activation falls back to 1, with no cache flush.
     - Renewing unlocks every member.
4. **Organization invitations:**
   - `Invitation`, invite dialog in `/users`, pending rows and revoke.
   - `/invitations`, sidebar badge, accept / decline, `/welcome` list.
   - Owner and admins invite and revoke; "Leave organization" (`OWNER_CANNOT_LEAVE`), `MembershipEvent` rows for leave / remove.
   - Every error code in section 7.3 (organization part).
   - *Verify:*
     - Owner + 3 including pending invites, and the fourth fails.
     - An invitee at 10 memberships cannot accept.
     - An admin can invite and a member cannot. A member who leaves frees the slot; the owner cannot leave.
     - A Free or expired owner cannot invite or have invites accepted.
     - Individual plan users can be invited.
5. **Business plan:**
   - Settings → Plan members card, plan invites (seat + organization), `ALREADY_SUBSCRIBED`, `SEAT_LIMIT`, `BUSINESS_REQUIRED`, `OWNER_HAS_NO_ORGANIZATION`.
   - Remove member (seat + membership); removing a seat holder from `/users` or a member leaving the owner's organization also ends the seat.
   - Renewal rule: Business owner with members renews Business only (`SEATS_IN_USE`), in `set-plan.ts` and the Plan section.
   - Individual plan on accept: warning dialog, `cancelIndividual` confirmation (`INDIVIDUAL_CANCEL_REQUIRED`), status `CANCELED`. `IN_BUSINESS_PLAN` while seated. The "renew your Individual plan" notice after removal or leaving.
   - "Invite by email — coming soon".
   - *Verify:*
     - A member becomes Pro and loses it when removed.
     - A member's own organization gets Pro limits.
     - Seat holders and Business owners (live or expired) cannot be invited. An Individual user can: accepting without confirmation fails, and with it the Individual plan ends up `CANCELED`.
     - A seated member cannot renew Individual. Once removed, they see the renew notice and keep Pro until their Individual period ends.
     - Expiration keeps members and shows the member banner without an action.
6. **Contract:** drop `User.organizationId` and `User.role` (and their indexes) once nothing reads them. Drop the `app-context` tag.

Later, as separate features: email invites (`token`, `/register?invite=`, an email provider), the payment provider (checkout, webhooks updating `Subscription`), and organization settings (rename).

---

## 11. Open decisions

- **Payment provider and prices** per plan and interval. Nothing is charged yet, and "Renew plan" / "Upgrade" stay coming soon.
- **Email provider** for the email invites feature and the "member left" email to the owner.
- **Billing intervals beyond monthly / yearly:** not needed; the enum can grow.

Decided (2026-10-16):

- Admins can invite into the organization (owner and admins); plan invites stay with the Business owner.
- Deactivated members keep their slot until they are removed or leave.
- Members can leave an organization; the owner is told by email (pending, email feature).
- A Business owner with members can only renew Business; switching to Individual needs every member removed first.
- Invitations expire after 14 days.
- Users with an Individual plan (live or expired) can be invited to a Business plan. Accepting cancels the Individual plan: auto-renew off, status `CANCELED`, after a warning the user has to confirm.
- The owner of a Business plan, live or expired, can never be invited to another Business plan.
- A member removed from the plan while their canceled Individual plan is still running gets a notice to renew it. While holding a seat they cannot renew or buy an Individual plan.

---

## 12. Updates to `context/project-overview.md`

Applied on 2026-10-16:

- **Section 4 (ERD):** add `MEMBERSHIP`, `SUBSCRIPTION`, `SUBSCRIPTION_SEAT` and `INVITATION`, plus `ORGANIZATION.ownerId`. `USER ||--o{ MEMBERSHIP }o--|| ORGANIZATION` replaces `ORGANIZATION ||--o{ USER`.
- **Section 5 (schema block):**
  - Add the models and enums from section 3.1.
  - `Organization.ownerId`.
  - Remove `User.organizationId` / `User.role` (after phase 6).
  - Update the intro sentence "one organization per user".
- **Schema notes:**
  - "Active-survey limit": per plan, read inside the transaction.
  - A new **"Plan and membership limits"** note: lock-then-count on the parent row, `ownerId @unique`, derived `isPro`.
  - "Users": per-organization deactivation, `OWNER_PROTECTED`.
- **API rules:** list the error codes from section 7.3. 403 is `PRO_REQUIRED` / `BUSINESS_REQUIRED`.
- **Routes:**
  - `/welcome`, `/invitations`, `/settings/plan`.
  - The `/settings` entry enabled.
  - `/register` without an organization name.
- **Checklist:** the six phases of section 10.
- **Open decisions:** section 11.
