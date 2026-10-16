# Services on Prisma

How to move the app's data from the in-memory stores to Prisma on Neon, and how to add the first real owner account.

The schema (`prisma/schema.prisma`, `init` migration) and the demo seed (`prisma/seed.ts`) are already on the `developer` branch. The app still reads `globalThis` stores.

## 1. Current state

### Stores and their callers

| Module | Functions (all **sync** today) | Called from |
| --- | --- | --- |
| `src/lib/surveys/service.ts` | `getSurvey`, `listSurveys`, `listActiveSurveys`, `getSurveyByCode`, `countActiveSurveys`, `hasResponses`, `createSurvey`, `updateSurvey`, `setSurveyActive`, `setSurveysActive`, `softDeleteSurvey(s)` | `actions/surveys.ts`, `surveys/list.ts`, `surveys/form-data.ts`, `surveys/public.ts`, `dashboard.ts`, `/surveys` page (count) |
| `src/lib/surveys/list.ts` | `listSurveys(orgId, params)`: filter, search, sort and paginate in memory, plus response counts | `/surveys` page |
| `src/lib/surveys/form-data.ts` | `getSurveyEditData` | `/surveys/[id]` page |
| `src/lib/surveys/public.ts` | `getPublicSurvey`, `submitPublicResponse` | `/s` page, `actions/kiosk.ts` |
| `src/lib/surveys/responses.ts` | `listResponses`, `addResponse` (`MOCK_RESPONSES` + kiosk answers) | `mock-data.ts` metrics, `public.ts` |
| `src/lib/users/service.ts` | `listUsers`, `getUser`, `getUserById`, `setUsersActive`, `setUserActive`, `softDeleteUsers`, `createUser`, `updateUser`, `updateProfile` (+ `verifyPassword`) | `actions/users.ts`, `users/list.ts`, `dashboard.ts`, `/users`, `/users/[id]`, `/profile` |
| `src/lib/users/list.ts` | `listUsers(orgId, currentUserId, params)` | `/users` page |
| `src/lib/mock-data.ts` | `MOCK_NOW`, `MOCK_*` data, `getMockSurveyMetrics`, `countMockResponses`, `getAnsweredOptionIds`, `LAST_30_DAYS` | `dashboard.ts`, `surveys/list.ts`, `users/list.ts`, `service.ts` |
| `src/lib/dashboard.ts` | `getAppContext` (mock session: Jordan in Acme), `getDashboardData`, `getPublicSurveyUrl` | `(app)/layout.tsx`, every admin page, every action |

Components only import **types** from these modules (`SurveyRow`, `UserRow`, `PublicSurvey`…). They don't change.

### Reads in the static shell

Cache Components prerenders a static shell. Today these reads run outside `<Suspense>`, which works only because they are synchronous memory reads:

- `(app)/layout.tsx` → `getAppContext()`: user name, avatar and the organization switcher.
- `/surveys` and `/users` pages → the total count shown in the top bar.

Once these become database queries (async I/O), Next refuses uncached data outside `<Suspense>`: "blocking-route" in dev, build error. Each such read must be either cached (`"use cache"`) or moved inside `<Suspense>`.

### Fixed clock

The mock lives on `MOCK_NOW` (2026-10-13). It anchors the date ranges (`getDateRange(range, MOCK_NOW)`), the "Today / Yesterday" labels (`now` passed to the tables) and `LAST_30_DAYS`. With the database the app uses the real time; the seed already writes dates relative to the moment it ran.

### Current user

There is no auth yet:
- `getAppContext()` returns `MOCK_CURRENT_USER` (Jordan Davis, OWNER) and `MOCK_CURRENT_ORGANIZATION` (Acme Inc.);
- every action builds its scope (`organizationId`, `userId`) from it;
- the organization switcher lists all mock organizations, although a user belongs to one.

## 2. New owner: Miguel Rayon in Leyinork

| Field | Value |
| --- | --- |
| Organization | **Leyinork**: `activeSurveyCount` 0, no surveys |
| Name | Miguel Rayon |
| Email | miguel@ellyonsoft.com |
| Phone | +528135574189 |
| Role | `OWNER`, active, only member of Leyinork |
| Password | given by the user; the seed holds **only its scrypt hash**, never the plain text |

Rules:

- **Where:** in `prisma/seed.ts`, as a separate "owner account" step after the demo data, not in `seed-data.ts`. The mock and the demo stay as they are, and Miguel is not part of the in-memory app.
- **Password (decided: no `.env` variable):** the hash is computed **once**, locally, with the `hashPassword` format of `password.ts` (`salt:hash`, scrypt, 64-byte key, 16-byte salt). Only that hash goes into `prisma/seed.ts` as `OWNER_PASSWORD_HASH`, so the seed works with no extra configuration.
  - The plain password never appears in code, docs, commits or chat logs written to the repo.
  - A one-off command (`npx tsx -e …` reading the password from a prompt, not from an argument that stays in the shell history) prints the hash to paste.
  - Changing the password later means regenerating the hash. Once Auth.js exists, the owner changes it from the profile.
- **Ids:** stable for idempotency: `objectId(organization, 3)` and `objectId(user, 9)`. Re-running deletes and recreates them like the demo rows.
- **Email:** `miguel@ellyonsoft.com` is unique. The idempotent delete includes it so a re-run never hits `P2002`.
- **Not in the switcher of other users:** a user only sees their own organization (see 3.6).

## 3. Design

### 3.1 Data access layer

- Services live under `src/server/` or keep their paths but switch to `import "server-only"` and the `prisma` client from `src/server/prisma.ts`. **Every function becomes `async`**, and callers `await` them. Pages are already async server components, and actions are async.
- Return the same TypeScript types as today (`Survey`, `User`, `SurveyRow`…), mapped from Prisma rows in one place per module (`toSurvey`, `toUser`), so components do not change.
- `passwordHash` is only selected inside the user service functions that verify or set it. A shared `USER_PUBLIC_SELECT` excludes it everywhere else.
- Soft delete: every survey and user query filters `deletedAt: null` (overview, "Soft delete").
- Prisma errors map to the existing codes:
  - `P2002` on `User.email` → `EMAIL_TAKEN`;
  - `P2002` on `Survey.code` → retry with a new code (up to 5);
  - `P2003` → `CATEGORY_LOCKED` / `NOT_FOUND` where a restrict blocks a delete;
  - not found → `NOT_FOUND`.

### 3.2 Surveys

| Function | Prisma |
| --- | --- |
| `getSurvey`, `listSurveys`, `listActiveSurveys` | `findFirst` / `findMany` by `organizationId`, `deletedAt: null`, include `questions` + `options` ordered by `position` |
| `getSurveyByCode` | `findUnique({ code })` + `deletedAt: null` |
| `hasResponses` | `prisma.responseItem.findFirst({ where: { question: { surveyId } }, select: { id: true } })` |
| `createSurvey` | Transaction: generate the code (retry on `P2002`); nested `create` of questions and options with `position`; if created active, increment `activeSurveyCount` with the guarded `updateMany` (`lt: 5`), else `ACTIVE_LIMIT` |
| `updateSurvey` | Transaction (overview, "Preserving ids on update"): update the questions / options sent with an `id`, create those without one, set `archivedAt` on the omitted ones; reject a category change when `hasResponses` (`CATEGORY_LOCKED`); retyping an option with answers creates a new option and archives the old one |
| `setSurveyActive` / `setSurveysActive` | Transaction: guarded counter (`updateMany where activeSurveyCount lte 5 - n`) then flip `isActive`; all or nothing; the `CHECK` constraint is the backstop |
| `softDeleteSurvey(s)` | Transaction: set `deletedAt`, decrement the counter for the active ones |

### 3.3 Users

| Function | Prisma |
| --- | --- |
| `listUsers`, `getUser`, `getUserById` | `findMany` / `findFirst` with `USER_PUBLIC_SELECT`, `deletedAt: null` |
| `createUser` | `create` with `hashPassword`, role `MEMBER`, active; `P2002` → `EMAIL_TAKEN` |
| `updateUser` / `updateProfile` | Select `passwordHash` only to verify the current password (own account); new hash only when a password is sent |
| `setUsersActive`, `softDeleteUsers` | Transaction: check every id first (no self change, at least one active `OWNER` left), then `updateMany`; all or nothing |

Survey "created by" reads the user with the public select (`include: { createdBy: { select: { name, email } } }`).

### 3.4 Responses and metrics

- `responses.ts` and `MOCK_RESPONSES` go away.
- **Submit** (`submitPublicResponse`): same validation as today against the survey loaded from the database. Then **one nested create**: `surveyResponse.create({ data: { …, items: { create: [...] } } })` with the snapshot. `@@unique([responseId, questionId])` guards against duplicate answers.
- **Metrics:** `src/server/metrics.ts` with the overview's section 6 SQL through `prisma.$queryRaw` (bound parameters). It returns counts per option for a survey or for all of an organization's surveys in a range, plus `totalResponses` (count of `SurveyResponse` in the range). It replaces `getMockSurveyMetrics` and `countMockResponses`. Convert `COUNT(*)` from `bigint` with `Number()`.
- **Range and time zone:** `getDateRange(key, new Date())` and the `TIME_ZONE` constant already used by the tables. `MOCK_NOW` and `LAST_30_DAYS` are deleted.
- **Rate limit:** stays in memory for now (one server process). The overview's shared limiter (by IP and `deviceId`) is a later hardening item.

### 3.5 Tables: search, filters and pagination in the database

Decided: the survey and user tables (and the dashboard search) filter, sort and paginate **in Postgres**, not in memory.

**Migration `search_unaccent`**, created with `migrate dev --create-only` on the developer branch and edited by hand:

```sql
CREATE EXTENSION IF NOT EXISTS unaccent;
-- unaccent() is STABLE; an IMMUTABLE wrapper allows expression indexes later
CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent', $1) $$;
```

No table changes. Prisma does not model the function, so it is only used from `$queryRaw`. A `pg_trgm` index on `f_unaccent(lower(name))` can come later if tables get large.

**Survey table (`listSurveys`)**: one `$queryRaw` built with `Prisma.sql` fragments (bound parameters only). It returns the page rows plus `COUNT(*) OVER()` as the total:

| Part | SQL |
| --- | --- |
| Scope | `"organizationId" = $org AND "deletedAt" IS NULL` |
| Search (name or code) | `f_unaccent(lower(name)) LIKE '%' \|\| f_unaccent(lower($q)) \|\| '%' OR lower(code) LIKE …`, with `%`, `_` and `\` in the query escaped (`ESCAPE '\'`) |
| Category / status | `category = ANY($categories)`, `"isActive" = $active` (only when set) |
| Responses in range | `LEFT JOIN (SELECT "surveyId", COUNT(*) FROM "SurveyResponse" WHERE "createdAt" >= $from AND "createdAt" < $to GROUP BY 1)` |
| Order | `"updatedAt" DESC, name COLLATE "und-x-icu"` (same order as today) |
| Page | `LIMIT $size OFFSET ($page - 1) * $size`, with the page clamped like `paginate()`: when the page is past the end, run again with the last page |

`totalAll` and `activeCount` come from one `count` / `groupBy` by organization.

**User table (`listUsers`)**: same shape.
- **Search:** `f_unaccent(lower(name))`, `lower(email)`, and phone digits with `regexp_replace(phone, '\D', '', 'g') LIKE '%' || $digits || '%'` (only when the query has digits).
- **Filters:** status.
- **Order:** `name COLLATE "und-x-icu", email`.
- **Excluded columns:** `passwordHash` is never selected.

**Dashboard**: the active-survey cards use the same survey search fragment. `matchesQuery` / `matchesUserQuery` and the in-memory `paginate` are no longer used by these lists.

**Parity check:** the existing search behaviors must still work. "lucia" finds "Lucía", "STORE" finds STORE7, "5512" finds "+52 55 1234 5678", and a query with `%` matches literally.

### 3.6 App context (current user) until Auth.js

- `getAppContext()` becomes async and reads the user from the database by **`PANDA_DEV_USER_EMAIL`** (env).
  - **Default:** `jordan@acme.co`, so the demo data shows.
  - **Miguel's account:** set `PANDA_DEV_USER_EMAIL=miguel@ellyonsoft.com` to work as Miguel in Leyinork, an empty dashboard to start from.
- The organization is the user's `organization`. The switcher lists only it, since a user belongs to one organization in the schema.
- If the email is not found or the user is inactive or deleted, it fails clearly in development.
- Auth.js replaces this later. Only `getAppContext` changes then, because every service already receives the scope from it.

### 3.7 Caching under Cache Components

Freshness matters: the dashboard and tables must show a kiosk answer or an edit right away. The pattern:

- **Organization-scoped reads in `"use cache"` functions with tags:**
  - `cacheTag("org:<id>:surveys")` for survey lists, counts and cards;
  - `"org:<id>:users"` for the user lists;
  - `"survey:<id>"` for one survey and its metrics.

  They are cached across requests and become part of the static shell where the input is known.
- **Every Server Action calls `updateTag(...)`** for what it changed instead of `revalidatePath`. Read-your-own-writes: the next render waits for fresh data.
  - The kiosk submit tags `survey:<id>` and `org:<orgId>:surveys`.
  - Survey actions tag the organization's surveys.
  - User actions tag the organization's users and, for the profile, the app context.
- **Request-dependent parts stay in `<Suspense>`:** `searchParams`, the date range and, after Auth.js, the session. The current Suspense boundaries already wrap the URL-driven content.
- **`getAppContext`:** cached by email with the tag `user:<email>`, so the layout keeps a static shell until there is a session cookie. After Auth.js it moves under Suspense or `"use cache: private"`.
- The `cacheLife` default is enough, because tags invalidate on every write.

### 3.8 Deleted at the end

- `src/lib/surveys/responses.ts`.
- The `globalThis` maps in both services.
- `mock-data.ts` (metrics move to `src/server/metrics.ts`; the `MOCK_*` exports have no callers left).
- The `MOCK_NOW` uses.

`src/lib/seed-data.ts` stays: it is the seed's data.

## 4. Verification

- `yarn lint`, `tsc --noEmit`, `yarn build` with no "blocking-route" / uncached-data errors. The route table keeps `◐` (partial prerender) for the admin pages.
- **As Jordan (default):** dashboard and `/surveys` show the seeded counts in the last 30 days (STORE7 1,842; Excelente 762). The user list shows the 8 Acme users. Edits, activations (5-active limit, also with two tabs at once), deletes and user changes persist after a server restart.
- **Kiosk:** an answer on `/s?code=STORE7` raises the dashboard count by one immediately, through `updateTag`. A draft survey returns `CLOSED`, and a double submit stores one response.
- **As Miguel** (`PANDA_DEV_USER_EMAIL=miguel@ellyonsoft.com`):
  - the sidebar shows Miguel Rayon, and the switcher shows only Leyinork;
  - the dashboard and the table are empty;
  - the user list shows only Miguel, who cannot deactivate or delete himself;
  - creating a survey works and appears at once.
- **Password:**
  - `verifyPassword(<owner password>, OWNER_PASSWORD_HASH)` is true, checked once locally;
  - the plain password appears in no tracked file or commit (`git grep` and `git log -S` find nothing).
- No `passwordHash` in any page payload: search the RSC payload of `/users` and `/profile`.

## 5. Phases

1. **Owner and app context**:
   - seed Leyinork and Miguel (password stored only as its precomputed hash);
   - async `getAppContext` from the database by `PANDA_DEV_USER_EMAIL`, cached and tagged;
   - the layout and the switcher read it.
2. **Users on Prisma**:
   - `search_unaccent` migration (extension + `f_unaccent`);
   - the user service async on Prisma (public select, transactions, `EMAIL_TAKEN`);
   - `users/list.ts` searching, filtering and paginating in SQL;
   - actions with `updateTag`;
   - `/users`, `/users/[id]` and `/profile` reading from the database.
3. **Surveys on Prisma**: the survey service (create with code retry, id-preserving update, guarded active counter, soft delete), `list.ts` and the dashboard search in SQL with response counts in the range, `form-data.ts`, actions with `updateTag`.
4. **Responses, metrics and kiosk**:
   - `src/server/metrics.ts` (SQL aggregation, real now and time zone);
   - kiosk read and submit with a nested create and `updateTag`;
   - delete `responses.ts`, the stores and `mock-data.ts`;
   - final verification against the seed.

## 6. Decisions (confirmed)

- **Default dev user: Jordan** (`PANDA_DEV_USER_EMAIL` defaults to `jordan@acme.co`, so the demo data shows). Miguel's account is reached by setting `PANDA_DEV_USER_EMAIL=miguel@ellyonsoft.com`.
- **Owner password: no `.env` variable.** The seed holds only the precomputed scrypt hash; the plain password is never committed.
- **Search, filters, sort and pagination in the database** (`unaccent` migration + `$queryRaw`), not in memory.
- **Caching: `"use cache"` + `cacheTag` per organization / survey + `updateTag` in every Server Action** (recommended). Organization-scoped reads are cached and shared across requests, and the static shells stay fast. Every write expires exactly what it touched, so the next render shows it (read-your-own-writes, including kiosk answers). Making every admin page fully dynamic would also be correct, but it queries Neon on every navigation and loses the static shells for no gain, since tags already keep the data fresh.
