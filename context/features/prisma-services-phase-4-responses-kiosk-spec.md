# Prisma Services Phase 4 — Responses, Metrics and Kiosk Spec

## Overview

Phase 4 of 4, which finishes the move to Prisma:

- metrics are computed with SQL aggregation in Postgres;
- kiosk submissions are written to Neon;
- the in-memory response store, the remaining stores and the mock are deleted.

After this phase the app reads and writes only the database. `src/lib/seed-data.ts` stays for the seed.

Full research in `docs/prisma-services.md` (sections 3.4, 3.7, 3.8).

## Decisions (from the research)

- **Metrics:** the overview's section 6 SQL through `prisma.$queryRaw` (bound parameters), real "now" and the `TIME_ZONE` constant.
- **Submit:** one nested `create` with the answer snapshot; `@@unique([responseId, questionId])` as a guard.
- **Rate limit:** stays in memory (one server process). A shared limiter is later hardening.
- **Caching:** metrics tagged `survey:<id>` and `org:<id>:surveys`; the kiosk submit action calls `updateTag` on both.

## Requirements

### Metrics (`src/server/metrics.ts`, server-only)

- **`getSurveyMetrics(survey, rangeKey)`** → `SurveyMetrics`, the same type as `getMockSurveyMetrics` returns today.
  - Per-option counts: `SELECT ri."answerOptionId", COUNT(*)::int` joined to `SurveyResponse`, filtered by `surveyId` and the range, grouped by option.
  - `totalResponses`: `COUNT(*)` of `SurveyResponse` in the range.
  - Then reuse `buildQuestionMetrics` (moved here from `mock-data.ts`): archived options with answers stay, rating average, shares.
- **`getOrganizationMetrics(orgId, surveyIds, rangeKey)`:** the same for all the dashboard cards in **one** grouped query (`WHERE "surveyId" = ANY(...)`), so the dashboard does not make one query per survey.
- **Range:** `getDateRange(rangeKey, new Date())`, computed inside the cached function, so the key is the `rangeKey`. `createdAt` is `timestamptz`; time zone handling follows the existing `TIME_ZONE` constant for day boundaries.
- **Conversion:** `COUNT(*)` with `::int`, or `Number()` for `bigint`.
- **Caching:** `"use cache"`, `cacheLife("hours")`, `cacheTag("survey:<id>")` and `cacheTag("org:<orgId>:surveys")`.
- **Callers:**
  - `dashboard.ts` (`getDashboardData`) and the survey table counts, which already come from SQL in phase 3;
  - `hasResponses` (phase 3) already queries the database;
  - `getAnsweredOptionIds`, if still used by `updateSurvey`, becomes `responseItem.findMany({ where: { question: { surveyId } }, distinct: ["answerOptionId"] })`.

### Kiosk on Prisma (`src/lib/surveys/public.ts`)

- **`getPublicSurvey(code)`:** async, from Prisma (phase 3 read), with the same reduced shape and kiosk ordering (faces Very bad → Excellent, stars 1 → 5).
- **`submitPublicResponse(input, meta)`:** async.
  1. Load the survey by code with its non-archived questions and options.
  2. Validate exactly as today: `NOT_FOUND`, `CLOSED`, and `INVALID` for a missing or duplicate question or an option of another question.
  3. Check the rate limit.
  4. Write with one `surveyResponse.create({ data: { surveyId, organizationId, source, deviceId, locale, durationMs, items: { create: [...] } } })`. Each item copies the snapshot (`answerType`, `answerValue`, `answerLabel`) from the stored option.
  - **Errors:** `P2002` (duplicate question in one response) → `INVALID`.
- **`actions/kiosk.ts`:** on success, replace `revalidatePath` with `updateTag("survey:<id>")` and `updateTag("org:<orgId>:surveys")`. The service returns the survey id and organization id for this.

### Cleanup

- **Delete:**
  - `src/lib/surveys/responses.ts`;
  - `src/lib/mock-data.ts`: `buildQuestionMetrics` moves to `metrics.ts`, and `MOCK_*`, `MOCK_NOW`, `LAST_30_DAYS`, `getMockSurveyMetrics`, `countMockResponses` and `getAnsweredOptionIds` are removed;
  - any leftover `globalThis` store.
- **Keep:** `src/lib/seed-data.ts` and the colors it exports. Imports of `REACTION_OPTIONS` / `POLL_FALLBACK_COLORS` point there.
- **No references left:** `grep` for `MOCK_`, `mock-data`, `listResponses` and `pandaSurveyStore` / `pandaUserStore` / `pandaResponseStore` returns nothing in `src/`.
- **`context/project-overview.md`:** a short note in section 8 that the services run on Prisma, with `PANDA_DEV_USER_EMAIL` as the acting user until Auth.js.

## Verification

- `yarn lint`, `tsc --noEmit`, `yarn build` with no uncached-data errors; the admin routes stay `◐`.
- **Dashboard (as Jordan, after `npx prisma db seed`):** the STORE7 card shows Excelente 762 / Muy bueno 602 / Bueno 296 / Malo 118 / Muy malo 64 and "1,842 responses" for the last 30 days. The other cards match the seed, and the 7 / 90 day and month ranges change the numbers.
- **Kiosk:**
  - answering STORE7 on `/s?code=STORE7` raises the card and the table by one immediately (`updateTag`), and the row exists in Neon with its items and snapshot;
  - Enter + click stores one response;
  - a draft code → `CLOSED`; an unknown code → `NOT_FOUND`;
  - two submits within 3 s → `RATE_LIMITED`;
  - after a restart the answer is still counted.
- **Category lock:** a survey that got its first kiosk answer becomes locked in the form.
- **Archived option:** removing an option with answers keeps its count visible in the card (archived), as today.
- **As Miguel:** a survey created in Leyinork, answered on the kiosk, shows its metrics. Jordan's dashboard is unaffected.
- **No mock left:** the `grep` above is clean; the app works with the in-memory code deleted.

## References

- @docs/prisma-services.md
- @src/lib/mock-data.ts
- @src/lib/surveys/public.ts
- @src/lib/surveys/responses.ts
- @src/actions/kiosk.ts
- @src/lib/dashboard.ts
- @src/lib/date-range.ts
- @context/project-overview.md (section 6, metrics query)
