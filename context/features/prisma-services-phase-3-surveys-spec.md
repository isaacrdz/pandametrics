# Prisma Services Phase 3 — Surveys Spec

## Overview

Phase 3 of 4: the surveys service, the survey table, the survey form data and the dashboard cards read and write Neon through Prisma instead of the in-memory survey store. The survey rules move into database transactions:

- the active-survey limit;
- id-preserving updates with archiving;
- the category lock;
- soft delete.

Response counts already come from the database in SQL. The metrics behind the cards switch in phase 4, so in this phase they keep using the response store and count from it.

Full research in `docs/prisma-services.md` (sections 3.1, 3.2, 3.5, 3.7).

## Decisions (from the research)

- Search, filters, sort and pagination in the database, using `f_unaccent` from phase 2.
- Active-survey limit enforced atomically with the guarded counter; the `CHECK` constraint is the backstop.
- Caching: `"use cache"` + `cacheTag("org:<id>:surveys")` / `"survey:<id>"`; survey actions call `updateTag`.

## Requirements

### Surveys service (`src/lib/surveys/service.ts`)

`import "server-only"`, `prisma`, every function `async`, same names and return types. A `toSurvey(row)` mapper builds the existing `Survey` type, with questions and options ordered by `position`.

- **Reads:** `getSurvey(orgId, id)`, `listSurveys(orgId)` and `listActiveSurveys(orgId)` filter by organization and `deletedAt: null`, and include questions → options ordered by `position`.
- **`getSurveyByCode(code)`:** `findUnique({ where: { code } })`, then `deletedAt: null`.
- **`countActiveSurveys(orgId)`:** `organization.activeSurveyCount`, with a dev assertion that it equals the count of active surveys.
- **`hasResponses(surveyId)`:** `responseItem.findFirst({ where: { question: { surveyId } }, select: { id: true } }) !== null`.
- **`createSurvey(scope, input)`**, in one transaction:
  1. **Code:** generate it (A–Z0–9, reserved tokens `SURVEY`, `PUBLIC`, `PANDA` rejected) and retry up to 5 times on `P2002`.
  2. **Rows:** nested `create` of questions and options with `position` (Satisfaction / Rating / Poll options as today).
  3. **Limit:** if created active, `organization.updateMany({ where: { id, activeSurveyCount: { lt: 5 } }, data: { activeSurveyCount: { increment: 1 } } })`; 0 rows → `ACTIVE_LIMIT`.
- **`updateSurvey(scope, id, input)`**, in one transaction (overview, "Preserving ids on update"):
  - **Category lock:** a category change with `hasResponses` → `CATEGORY_LOCKED`.
  - **Questions:** sent with an `id` → `update` (text, position); without one → `create`; omitted and stored → set `archivedAt`.
  - **Options:** same per question. Changing the `type` / `value` of an option with answers creates a new option and archives the old one.
  - **Active change:** goes through the guarded counter (increment with `lt: 5`, or decrement).
  - **`updatedAt`:** updated.
- **`setSurveyActive` / `setSurveysActive`**, in one transaction:
  1. load the targets (missing → `NOT_FOUND`);
  2. compute the delta;
  3. guarded `updateMany` on the counter (`lte: 5 - delta` when activating);
  4. flip `isActive`.

  All or nothing.
- **`softDeleteSurvey(s)`:** transaction that sets `deletedAt` and decrements the counter for the active ones.
- **Errors:** a `P2003` from a restrict (should not happen with soft delete) → `NOT_FOUND`.
- **Remove** the `globalThis` survey map and the `MOCK_SURVEYS` import.

### Survey table (`src/lib/surveys/list.ts`)

- `listSurveys(orgId, params)` is async: one `$queryRaw` with `Prisma.sql` fragments.

| Part | SQL |
| --- | --- |
| Scope | `s."organizationId" = ${orgId} AND s."deletedAt" IS NULL` |
| Search | `f_unaccent(lower(s.name)) LIKE f_unaccent(lower(${pattern})) ESCAPE '\' OR lower(s.code) LIKE lower(${pattern}) ESCAPE '\'` |
| Category / status | `s.category = ANY(${categories}::"SurveyCategory"[])`, `s."isActive" = ${active}` (only when set) |
| Responses in range | `LEFT JOIN (SELECT "surveyId", COUNT(*)::int AS n FROM "SurveyResponse" WHERE "createdAt" >= ${from} AND "createdAt" < ${to} GROUP BY 1) r ON r."surveyId" = s.id` |
| Order | `s."updatedAt" DESC, s.name COLLATE "und-x-icu"` |
| Page | `LIMIT` / `OFFSET`, `COUNT(*) OVER()`, page clamp as in phase 2 |

- **Range:** `getDateRange(params.range, new Date())`.
- **Counts:** `totalAll` and `activeCount` come from one `groupBy` on `isActive` for the organization.
- **`now`:** the real time.
- **Search helper:** a shared `searchPattern` / `escapeLike` in `src/server/search.ts`, used by both phases.

### Survey form data and dashboard

- **`form-data.ts`:** `getSurveyEditData(orgId, id)` is async. It loads the survey with `createdBy` (public select: name, email), `hasResponses` and the public URL.
- **`dashboard.ts`:** `getDashboardData` is async. The active surveys are filtered by the same search fragment (SQL), and the cards keep their metrics from the response store until phase 4.
- **`public.ts`:** `getPublicSurvey` / `submitPublicResponse` await `getSurveyByCode` (the read moves to Prisma; the submit write moves in phase 4).
- **Pages to `await`:** `/dashboard`, `/surveys`, `/surveys/new`, `/surveys/[id]`, `/s`.

### Caching

- **Tags:**
  - `cacheTag("org:<orgId>:surveys")` on the list, the counts and the dashboard reads;
  - `cacheTag("survey:<id>")` on the form data.
- **Range-dependent reads:** they receive the `rangeKey` (not dates) and compute the range inside the cached function with `cacheLife("hours")`, so the cache key stays stable. Writes still expire it at once through tags.
- **Static shell:** the `/surveys` top-bar count stays in it.
- **`actions/surveys.ts`:** await the service; replace `revalidatePath` with `updateTag("org:<orgId>:surveys")` and `updateTag("survey:<id>")` for each changed survey.

## Verification

- `yarn lint`, `tsc --noEmit`, `yarn build` with no uncached-data errors.
- **As Jordan:**
  - `/surveys` shows the 5 seeded surveys with the last-30-day counts (STORE7 1,842, EVENT2 788, PROD91 348, HELP44 84, 5XS1NK draft);
  - search "store", "5xs", "pruebas" (accents and case), type and status filters, page sizes and the page clamp;
  - the dashboard cards still show the metrics.
- **Create:** a survey as draft; then active (counter +1). Activating a 6th survey → limit message, nothing changes. Two tabs activating at once → only one succeeds (the `CHECK` never trips).
- **Edit:**
  - rename a question;
  - remove an option of a survey with responses → archived, not deleted, and its answers still count;
  - change the category of a survey with responses → `CATEGORY_LOCKED`.
- **Bulk:** activate / draft / delete, all or nothing. A deleted active survey frees a slot (counter −1).
- **As Miguel:** create and edit a survey in Leyinork; it appears at once (`updateTag`). Jordan does not see it.
- **Persistence:** everything survives a server restart. `npx prisma db seed` restores the demo.

## References

- @docs/prisma-services.md
- @src/lib/surveys/service.ts
- @src/lib/surveys/list.ts
- @src/lib/surveys/list-params.ts
- @src/lib/surveys/form-data.ts
- @src/lib/surveys/public.ts
- @src/lib/dashboard.ts
- @src/actions/surveys.ts
- @context/project-overview.md (section 5, "Important schema notes")
