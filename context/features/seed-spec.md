# Seed Data Spec

## Overview

Create a seed script (`prisma/seed.ts`) that fills the Neon **development** branch with the same data the app uses today in `src/lib/mock-data.ts`:
- 2 organizations;
- 8 users;
- 5 surveys with their questions and options;
- 3,071 responses with the same per-option counts.

Pages can then be built and demoed against real rows, and they look the same as with the mock once the services read from Prisma.

Depends on `context/features/database-spec.md` (schema and first migration applied).

## Decisions

- **One source of truth**: the seed data moves out of `mock-data.ts` into a plain module that both the mock and the seed import, so they can never drift. See "Shared seed data".
- **Same ids as the mock**:
  - the seed inserts the mock's ids (`objectId(kind, n)`, 24 hex characters);
  - URLs like `/surveys/000300000000000000000002` and the "current user" id keep working.

  The schema's `cuid()` default only applies to rows created later by the app.
- **Dates relative to the run**: the mock is anchored at a fixed `MOCK_NOW` (2026-10-13). The seed anchors every "days ago" at the moment it runs, so "last 30 days" always has data in the database.
- **Same response counts**:
  - each option receives exactly the count from the survey seeds, using the same seeded random pairing (mulberry32, seed `surveyNumber * 7919`);
  - the dashboard and table totals match the mock: STORE7 1,842, EVENT2 788, PROD91 348, HELP44 84, 5XS1NK 9.

## Shared seed data (`src/lib/seed-data.ts`)

Move from `src/lib/mock-data.ts` into a new module with no `server-only` and no store imports, so `tsx` can load it outside Next:
- `ID_KIND`, `objectId`, `createRandom`, `shuffle`;
- `REACTION_OPTIONS`, `RATING_COLORS`, `POLL_FALLBACK_COLORS`;
- the organization and user seeds;
- `SURVEY_SEEDS` and the `reaction` / `rating` / `poll` helpers;
- `buildSurvey`, `buildAnswerColumns`, `buildResponses`, each taking a `now: Date` instead of the fixed `MOCK_NOW`.

`mock-data.ts` keeps `MOCK_NOW` and its exports (`MOCK_ORGANIZATIONS`, `MOCK_USERS`, `MOCK_SURVEYS`, `MOCK_RESPONSES`, the metrics functions) by calling the shared builders with `MOCK_NOW`. The mock and the app stay exactly as they are; verify the dashboard counts are unchanged.

## Data

### Organizations (`Organization`)

| id | Name | `activeSurveyCount` | Created | Updated |
| --- | --- | --- | --- | --- |
| `objectId(organization, 1)` | Acme Inc. | 4 | 180 days ago | 2 days ago |
| `objectId(organization, 2)` | Panda Labs | 0 | 40 days ago | 40 days ago |

`activeSurveyCount` for Acme must equal its active seeded surveys (STORE7, EVENT2, PROD91, HELP44 = 4; 5XS1NK is a draft). The seed computes it from the surveys instead of hard-coding it.

### Users (`User`)

All in Acme, `deletedAt: null`, no `Account` / `Session` rows (sign-in is a later feature).

| # | Name | Email | Role | Phone | Image | Active | Created / updated (days ago) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Jordan Davis | jordan@acme.co | OWNER | +525512345678 | — | Yes | 180 / 1 |
| 2 | Ana López | ana@acme.co | ADMIN | — | — | Yes | 120 / 10 |
| 3 | Sofía Ramírez | sofia@acme.co | ADMIN | +525598765432 | `/avatars/sofia.svg` | Yes | 90 / 0 |
| 4 | Marco Silva | marco@acme.co | MEMBER | — | `/avatars/missing.jpg` (broken on purpose: shows the initials fallback) | Yes | 75 / 3 |
| 5 | Lucía Fernández | lucia@acme.co | MEMBER | +523312344321 | — | Yes | 60 / 6 |
| 6 | Diego Herrera | diego@acme.co | MEMBER | — | — | No | 50 / 20 |
| 7 | Emily Chen | emily@acme.co | MEMBER | +14155550134 | — | Yes | 30 / 2 |
| 8 | Tomás Ortega | tomas@acme.co | MEMBER | — | — | No | 20 / 15 |

- **Ids:** `objectId(user, n)`; Jordan (1) is the current user of the mock.
- **`passwordHash`:** the development password `panda-dev-1`, hashed with scrypt in the same `salt:hash` (hex) format as `src/lib/users/password.ts` (64-byte key, 16-byte salt). The seed cannot import that file (`server-only`), so it repeats the few lines of `hashPassword`. Move the format into `seed-data.ts` only if it stays free of `server-only`.
- **`emailVerified`:** equal to `createdAt`.

### Surveys (`Survey` + `Question` + `AnswerOption`)

All in Acme. Ids follow the mock:
- survey `objectId(survey, n)`;
- question `objectId(question, n*10 + qi)`;
- option `objectId(option, n*100 + qi*10 + oi)`.

`position` is the 0-based index (`qi`, `oi`). `updatedAt` equals `createdAt`, and `archivedAt` is null.

| # | Code | Name | Category | Active | Created by | Created (days ago) | Responses spread (days ago) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | STORE7 | In-store experience | SATISFACTION | Yes | Jordan | 90 | 0–29 |
| 2 | EVENT2 | Event check-in | SATISFACTION | Yes | Jordan | 21 | 0–20 |
| 3 | PROD91 | Product feedback | RATING | Yes | Jordan | 45 | 0–29 |
| 4 | HELP44 | Support follow-up | POLL | Yes | Ana | 60 | 0–29 |
| 5 | 5XS1NK | Pruebas con QR | SATISFACTION | No | Ana | 75 | 40–70 |

Descriptions, question texts, option labels, values, colors and counts are exactly those of `SURVEY_SEEDS`:
- **Satisfaction:** the five reactions `VERY_BAD` … `INCREDIBLE` with labels "Muy malo" … "Excelente" and `REACTION_OPTIONS` colors.
- **Rating:** values `1`–`5`, labels "1 estrella" … "5 estrellas", color `#f59e0b`.
- **Poll:** `TEXT` options with the label as value and the `POLL_FALLBACK_COLORS` in order.

Per-question counts (Very bad → Excellent, 1 → 5 stars, or poll order):

| Survey | Question 1 | Question 2 | Total responses |
| --- | --- | --- | --- |
| STORE7 | 64, 118, 296, 602, 762 | 92, 154, 388, 571, 637 | 1,842 |
| EVENT2 | 21, 43, 132, 270, 322 | 35, 58, 171, 244, 280 | 788 |
| PROD91 | 12, 18, 46, 108, 164 | 9, 22, 61, 121, 135 | 348 |
| HELP44 | La navegación 34, Más opciones de personalización 26, La velocidad de respuesta 18, El diseño 6 | Chat 41, Correo 27, Teléfono 16 | 84 |
| 5XS1NK | 0, 0, 0, 3, 6 | 0, 1, 2, 3, 3 | 9 |

### Responses (`SurveyResponse` + `ResponseItem`)

Built with the shared `buildResponses`, as in the mock:
- **Structure:** one response per row of the shuffled answer columns, so every response answers every question.
- **Ids:** response `objectId(response, n*100000 + i)`, organization `organizationId` of the survey.
- **`source`:** picked from `KIOSK, KIOSK, QR, LINK`.
- **`deviceId`:** `kiosk-{n}-{1..3}` for `KIOSK`, otherwise null.
- **`locale`:** `es` 85%, `en` 15%.
- **`durationMs`:** 6–40 s.
- **`createdAt`:** spread within the survey's window.
- **Items:** ids generated by the database (cuid), with the snapshot (`answerType`, `answerValue`, `answerLabel`) copied from the option.

## Implementation notes

- **Seed command:** registered in `prisma.config.ts` (`migrations.seed: "tsx prisma/seed.ts"`) and run with `npx prisma db seed`. In Prisma 7, `migrate dev` and `migrate reset` no longer run the seed automatically.
- **Client:** the script loads `.env` with `dotenv` and builds its own `PrismaClient` with `PrismaPg` (`DATABASE_URL`), like `scripts/test-db.ts`. It cannot import `src/server/prisma.ts` because of `server-only`. Imports with the `@/` alias work under `tsx`, which reads `tsconfig.json` paths.
- **Idempotent:** running it twice gives the same data. Delete the seeded rows first, scoped to the two seeded organization ids, in foreign-key order:
  1. `SurveyResponse` (its items cascade);
  2. `AnswerOption`;
  3. `Question`;
  4. `Survey`;
  5. `User`;
  6. `Organization`.

  Then create everything again in a transaction.
- **Volume:** about 3,071 responses and 6,142 items. Insert surveys with nested `create` (questions and options). Insert responses and items with `createMany` in batches of about 500, generating the response ids up front so the items can reference them.
- **Development only:** print the database host before writing. Refuse to run when `NODE_ENV === "production"` or when `DATABASE_URL` does not contain the development branch's endpoint id, set in `NEON_DEV_ENDPOINT` in `.env`.
- **Seed data only:** no schema changes and no new migration.
- **Logging:** log counts at the end, for example "2 organizations, 8 users, 5 surveys, 10 questions, 47 options, 3071 responses, 6142 items".

## Verification

- `npx prisma db seed` finishes and prints the counts above. Running it again prints the same counts, with no duplicates and no unique-constraint errors.
- In Prisma Studio:
  - Acme has 4 as `activeSurveyCount`;
  - Jordan is `OWNER`, Diego and Tomás are inactive;
  - STORE7 has 2 questions with 5 options each and positions 0–4;
  - response items for "Excelente" on STORE7's first question number 762.
- An SQL count per option (overview section 6 query, last 30 days) matches the dashboard: STORE7 1,842 responses, Excelente 762 / Muy bueno 602 / Bueno 296 / Malo 118 / Muy malo 64.
- Verifying a seeded user's `passwordHash` with `verifyPassword("panda-dev-1", hash)` from `src/lib/users/password.ts` returns true.
- After moving the seed data into `src/lib/seed-data.ts`, the app is unchanged: `yarn lint`, `tsc --noEmit` and `yarn build` pass, and `/dashboard` and `/surveys` show the same counts as before.
- The script refuses to run with a production `DATABASE_URL`.

## References

- @src/lib/mock-data.ts
- @src/lib/users/service.ts (development password)
- @src/lib/users/password.ts (hash format)
- @src/types/survey.ts
- @context/features/database-spec.md
- @context/project-overview.md (sections 4, 5 and 6)
