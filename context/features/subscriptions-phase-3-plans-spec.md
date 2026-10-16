# Subscriptions Phase 3 — Subscriptions and Plan Limits

## Overview

Phase 3 of 6 of plans and organizations. This phase adds:

- the subscription data;
- the derived plan of each user (Free, Pro, expired);
- the active-survey limit per plan: 1 on Free, 5 on Pro;
- the plan badge;
- the expired-plan banner;
- the first version of Settings → Plan.

There is no payment provider: plans are set with a data script and the seed. "Upgrade" and "Renew plan" are shown as coming soon. Business seats are created by the seed only; inviting to the plan comes in phase 5.

Full research: `docs/subscriptions.md` (sections 2, 4, 7.2, 8.1, 8.3 and 8.6).

## Decisions (from the research)

- **The plan lives in a `Subscription` model**, one per paying user (`userId @unique`), updated in place. Business members hold a `SubscriptionSeat` pointing at the owner's subscription.
- **`isPro` is never stored.**
  - A subscription is *live* when `status !== "INCOMPLETE"` and `currentPeriodEnd > now`.
  - `CANCELED` and `PAST_DUE` stay Pro until `currentPeriodEnd`.
  - "Expired" is `currentPeriodEnd <= now`, so nothing has to run when a period ends.
- **A seat wins over an own subscription.** Tier rules:
  - `PRO`: the seat's subscription is live, or the user's own subscription is live.
  - `EXPIRED`: a seat or an own subscription exists, but nothing is live.
  - `FREE`: neither exists.
- **An organization's limits are its owner's plan.**
  - Pro: 5 active surveys.
  - Free or expired: 1 active survey.
  - Surveys already active stay active after a downgrade.
- **The cache holds the raw rows; the tier is computed per request** with `new Date()`. A cached Pro turns expired the moment the period ends.

## Requirements

### Schema and migration

- **New schema** (research 3.1): `PlanType`, `BillingInterval`, `SubscriptionStatus`, `Subscription` (with the optional provider columns) and `SubscriptionSeat`, plus the relations `User.subscription` and `User.seat`.
- **Migration:** `subscriptions`. Add by hand `CHECK ("currentPeriodEnd" > "currentPeriodStart")`. There is no backfill: every existing user starts on Free.

### Plan logic

- **`src/lib/plans/limits.ts` (shared):**
  - `PLAN_LIMITS` (`FREE: { activeSurveys: 1, invites: 0 }`, `PRO: { activeSurveys: 5, invites: 3 }`)
  - `BUSINESS_SEATS = 3`
  - `MAX_MEMBERSHIPS` (from phase 2)
  - `limitsFor(tier)`
- **`src/lib/plans/plan.ts` (pure, shared):**
  - Types: `PlanTier`, `PlanState` (`tier`, `planType`, `source: "OWN" | "SEAT" | null`, `isPlanOwner`, `currentPeriodEnd`, `subscriptionId`, `ownerName` for seats).
  - Functions: `subscriptionIsLive(sub, now)` and `resolvePlan({ own, seat }, now)`.
- **`src/server/plans.ts`:**
  - `loadPlanRows(userId)`: the own subscription, plus the seat with its subscription and owner name. It is `"use cache"`, tagged `user:{id}` and `subscription:{id}` for each subscription read.
  - `organizationTier(tx, organizationId, now)`: reads the owner's rows inside a transaction, never cached.
- **`ACTIVE_SURVEY_LIMIT` is removed.**

### Contexts

- **`AccountContext.plan`:** the user's own `PlanState`, computed outside the cache.
- **`AppContext.organizationPlan`:** the active organization owner's plan.
- **`AppContext.limits`:** `{ activeSurveys, invites }` from `limitsFor(organizationPlan.tier)`.
- **`AppShellProvider`:** gets `plan`, `organizationPlan` and `limits` for the client components.

### Active-survey limit per plan

- **`changeActiveCount(tx, organizationId, delta)`:**
  - Reads the limit with `organizationTier(tx, …)` and guards `activeSurveyCount <= limit - delta`.
  - Throws `ACTIVE_LIMIT` with `{ limit, tier }`.
  - A delta of 0 or a negative delta always passes, so editing or deactivating an organization above its limit works.
  - The `CHECK (… BETWEEN 0 AND 5)` stays.
- **The survey actions** return `ACTIVE_LIMIT` with `limit` and `tier`.
- **Messages:**
  - Free: "Free plan: 1 active survey. Upgrade to Pro for 5."
  - Pro: "Pro plan: up to 5 active surveys."
  - They replace every use of the constant: `PublishToggle`, `SurveyForm`, `SurveysSelectionBar`, `SurveyActionsMenu` toast, and the "x of N active" label (`limits.activeSurveys`).

### Plan badge

- **`SidebarUser` / `NavUser`:** a pill next to the name:
  - "Pro": accent.
  - "Free": muted.
  - "Expired": destructive-muted.
- **`ProfilePictureCard`:** the same badge plus the plan name ("Pro · Business", "Free").

### Expired-plan banner

- **Component:** `PlanExpiredBanner` in `(app)/layout.tsx`, at the top of `SidebarInset` above each page's top bar, rendered from `AccountContext.plan` when `tier === "EXPIRED"`.
- **Text:**
  - Member (`source: "SEAT"`): "{owner}'s Business plan expired on {date}. Pro features are paused until it is renewed." No action.
  - Plan owner: "Your {Individual | Business} plan expired on {date}. Pro features are paused." Plus a **Renew plan** button: muted, "Coming soon" tooltip, `aria-disabled` (same pattern as `InviteUserButton`).
- **Dismissal:** dismissible for the session (`sessionStorage`, wrapped in try / catch). It comes back on the next visit.
- **Accessibility:** `role="status"`; dates through `useFormatter`.

### Settings → Plan

- **Navigation:** `NavMain` `settings` is enabled. `/settings` redirects to `/settings/plan`.
- **`/settings/plan`:** uses `getAccountContext()`, so it works without an organization. It has a top bar heading "Plan".
- **Free:** the current plan with its limits, plus Individual and Business cards (what they include) with "Upgrade — coming soon".
- **Individual or Business owner:** plan name, interval, last payment (`paidAt`), "Renews on / Ends on / Expired on {date}" by status, and Renew plan (coming soon) when expired or canceled.
- **Business member:** "You are on {owner}'s Business plan", plus the expiry. Read-only.
- **Phase 5** adds the Business members card.
- **Proxy:** the matcher adds `/settings/:path*`.

### Manual plans: `scripts/data/set-plan.ts`

- **Arguments:** `--email`, `--type INDIVIDUAL|BUSINESS`, `--interval MONTHLY|YEARLY`, `--status`, `--expired` (the period ended yesterday), `--remove`.
- **Upsert:** upserts the user's `Subscription` with the period starting today and `paidAt` now.
- **Database guard:** like the seed (`NEON_DEV_ENDPOINT`), unless `--production` is passed explicitly.
- **Phase 5** adds the renewal rules (`SEATS_IN_USE`, `IN_BUSINESS_PLAN`).

### Seed

- **Jordan:** **Business**, monthly, active, period ending in 20 days.
- **Ana and Sofía:** seats on Jordan's plan.
- **Valeria (Panda Labs):** **Individual**, yearly, expired 3 days ago. Panda Labs gets 2 active surveys, above Free's 1.
- **Nora and Miguel:** Free.
- **Delete order:** add seats and subscriptions.

### i18n

- **New namespace `plan`:** tiers, plan types, intervals, badge, banner texts, settings page and limit messages. Both languages.

## Testing

1. **Free limit:**
   - Nora (Free, with her organization from phase 2) activates 1 survey.
   - A second activation → the Free message.
   - Two parallel activations → only one succeeds.
2. **Pro limit:** Jordan (Business) keeps Acme's 4 active, activates a 5th, and the 6th fails.
3. **Expired plan (Valeria):**
   - Her owner banner shows Renew (coming soon).
   - Panda Labs keeps its 2 active surveys, and can edit and deactivate them.
   - Activating another fails, until the count is 0 and she activates 1.
4. **Expiry with no cache flush:**
   - `set-plan.ts --email jordan@acme.co --type BUSINESS --interval MONTHLY` with the period ending in 1 minute.
   - After it passes, a reload shows the expired banner for Jordan, plus the member banner (no action) for Ana and Sofía.
   - Acme's limit becomes 1, with no cache flush.
   - Renewing with the script unlocks all three on the next request.
5. **Badges and settings:**
   - The sidebar badge and the profile badge show Free / Pro / Expired.
   - `/settings/plan` shows the right variant for Nora, Valeria, Jordan and Ana.
6. **Checks:**
   - `grep -rn ACTIVE_SURVEY_LIMIT src` → nothing.
   - `yarn lint` and `tsc` pass.

## References

- @docs/subscriptions.md
- @prisma/schema.prisma
- @src/lib/surveys/service.ts
- @src/lib/surveys/constants.ts
- @src/components/surveys/form/PublishToggle.tsx
- @src/components/surveys/SurveyActionsMenu.tsx
- @src/components/layout/NavMain.tsx
- @src/components/layout/SidebarUser.tsx
- @src/components/users/ProfilePictureCard.tsx
- @src/components/layout/InviteUserButton.tsx
- @prisma/seed.ts
