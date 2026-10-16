# Subscriptions and Plan Limits (Free / Pro)

## Output

`docs/subscriptions.md`

## Research

Document how to add paid plans to Panda Metrics and enforce the limits of each plan:

1. **Subscription data**: know when a user has paid for Pro (`isPro`), and store what they are subscribed to:
   - Plan type: **Individual** (one user) or **Business** (the owner plus up to 3 more users, 4 Pro users in total; members get Pro from the owner's subscription).
   - Billing interval: monthly, yearly (and whether other intervals make sense).
   - Payment date (last successful payment) and expiration date (the end of the paid period).
   - Status (active, canceled at period end, expired, past due) and what makes `isPro` true or false.
2. **Plan limits** (see "Plans and limits" in `context/project-overview.md`):
   - Active surveys: **1** on Free, **5** on Pro.
   - Inviting users into an organization: **Pro only** (Individual or Business), owner + up to **3** invited people. Users with their own Individual plan can be invited into an organization.
   - A user can be the **owner of only one** organization.
   - A user can belong to at most **10** organizations, counting the one they own.
3. **Business plan invites**: a new Settings section where the Business owner invites up to 3 users to the plan.
   - Users with an active plan (Individual, or owner / member of another Business plan) cannot be invited to the plan.
   - An invite to the plan also adds the person to the owner's organization (it counts toward the organization's 3 invited members).
   - Only users who already have an account can be invited for now; they accept in the app. **Email invites** for people without an account are a later feature: the UI shows them as coming soon, and the data model only needs to leave room for them.
   - When the owner removes a member from the plan, the member also leaves the owner's organization.
   - When the plan expires, nobody is removed: owner and members stay in the plan and the organization and lose access to the Pro features until it is renewed. Members see an "expired plan" notice; the plan owner (Individual or Business) sees the notice with a "Renew plan" action to pay and unlock the plan (coming soon until there is a payment provider).
4. **Registration without an organization**: signing up no longer creates an organization (today `createUserWithOrganization` does). A new account has no organization and no plan; the user creates their own organization (the only one they can own) or joins one through an invite. An account that comes from a plan invite is not given an organization of its own, but any user who does not own one can create it later, Business members included.
5. **Organization required for surveys**: before creating a survey, on any plan, the server checks that the user has an active organization; without one it rejects the action and the UI sends them to create their organization.
6. **Multiple organizations**: today `User.organizationId` holds a single organization and `getAppContext()` returns `organizations: [organization]`. The 10-organization rule needs a membership model (user ↔ organization with a role) and a real organization switcher.

The result must be detailed enough to split the work into phased feature specs. There is no payment provider and no prices yet (both stay as pending decisions); the data model must work without them (plans set by hand or by seed) and stay ready for a provider later.

## Include

Current state:

- `User` and `Organization` models (`prisma/schema.prisma`): `role` and `organizationId` on `User`, `activeSurveyCount` on `Organization`.
- Active limit today: `ACTIVE_SURVEY_LIMIT`, the atomic counter update in `src/lib/surveys/service.ts` (`ACTIVE_LIMIT` error), `PublishToggle` error message, dashboard and survey form usages.
- Registration (`createUserWithOrganization` in `src/server/auth-users.ts`, email / password and Google sign-up): every new account owns a new organization today.
- Acting user and organization (`src/server/app-context.ts`; today a user without an organization cannot use the app), `src/proxy.ts`, `OrganizationSwitcher`, `AppShellProvider`, `InviteUserButton` (coming soon), `UsersTopBar`.
- Seed data (`prisma/seed.ts`, `src/lib/seed-data.ts`) and existing migrations.

What to define:

- **Where the plan lives**: on the user (who pays) vs. a `Subscription` model linked to the user, and how an organization gets its limits (the owner's plan). Recommend one and explain why. Whether `isPro` is a stored column or derived from status + expiration (and how both stay consistent).
- **Schema**: enums (`PlanType` INDIVIDUAL / BUSINESS, `BillingInterval` MONTHLY / YEARLY, `SubscriptionStatus`), fields (`paidAt`, `currentPeriodEnd`, `canceledAt`, provider ids kept optional), indexes, migration and backfill (existing users start on Free).
- **Memberships**: `Membership` model (`userId`, `organizationId`, `role`, `@@unique([userId, organizationId])`), migrating `User.organizationId` and `User.role` into it, the active organization (cookie or session), and every query that scopes by organization.
- **Limits and validations**, each with the exact check, where it runs (service, Server Action, Zod) and how it stays safe under concurrent requests:
  - Active surveys per plan (generalize the atomic counter; a `CHECK` that no longer is a fixed 5).
  - Invites: Pro only, max 3 invited members, what counts (pending invites, deactivated members).
  - One owned organization per user (partial unique index on memberships where `role = OWNER`, or equivalent).
  - Max 10 memberships per user, including the owned one; what happens on invite accept when the invitee is at 10.
- **Plan seats**: how Business members are stored (e.g. `SubscriptionSeat` / plan member rows pointing to the owner's subscription), how a member's `isPro` is resolved, max 3 seats enforced atomically, and the check that an invitee has no active plan.
- **Invitations (in-app, existing accounts)**: `Invitation` model (invited user, organization, whether it includes a plan seat, status, expiry), how the invitee finds and accepts / declines it in the app, revoking, and the fields left ready for email invites later (email, token). No email sending in this feature.
- **No organization after sign-up**: what a signed-in user without an organization sees (onboarding: create my organization, pending invites), which routes they can reach, the create-organization flow and its one-owned check, and what changes in `app-context`, the layout, the sidebar and the proxy. Existing users keep their organization (migrated to memberships as owners).
- **Settings → Plan section** (Business owners only): seats used / available, member list, invite form (existing users), pending invites, remove member (also removes the organization membership), and the email invite shown as coming soon.
- **Removal**: removing a plan member ends their seat and their membership in the owner's organization in one transaction; their surveys stay with the organization; what happens if that organization was their active one.
- **Expiration**: owner and members stay; which Pro features get blocked (activating above the Free limit, invites, Plan section changes); surveys already active stay active. The notice for members (no action) vs. the notice for the plan owner with "Renew plan" (where it appears, what it links to while payments are coming soon), and how renewing unlocks the plan for every member.
- **Organization check on survey creation**: where it runs (Server Action / service, plus the "New survey" buttons and `/surveys/new`), the error code (`NO_ORGANIZATION`) and the redirect to the create-organization flow.
- **Error codes and UI**: new error codes (`PLAN_LIMIT`, `INVITE_LIMIT`, `SEAT_LIMIT`, `ALREADY_SUBSCRIBED`, `OWNER_LIMIT`, `MEMBERSHIP_LIMIT`, `PRO_REQUIRED`…), messages in `en.json` / `es.json`, "Upgrade to Pro" states, plan badge in the sidebar / profile.
- Session / app-context shape (plan, limits), cache tags to invalidate, seed changes.
- Updates to `context/project-overview.md` (schema block, schema notes, API rules, checklist, open decisions).
- Open decisions, phases and verification.

## Sources

- @prisma/schema.prisma
- @prisma/seed.ts
- @src/lib/surveys/service.ts
- @src/lib/surveys/constants.ts
- @src/components/surveys/form/PublishToggle.tsx
- @src/server/auth-users.ts
- @src/server/app-context.ts
- @src/components/layout/OrganizationSwitcher.tsx
- @src/components/layout/AppShellProvider.tsx
- @src/components/layout/InviteUserButton.tsx
- @src/components/users/table/UsersTopBar.tsx
- @src/lib/users/service.ts
- @src/types/survey.ts
- @context/project-overview.md
- @docs/auth.md
- @docs/users.md
- @src/app/(app)/settings/ (if it exists) and the register page / `src/actions/auth.ts`
- @src/proxy.ts
- @src/app/(app)/layout.tsx
- Context7: Prisma (partial unique indexes, `CHECK` constraints in migration SQL)
