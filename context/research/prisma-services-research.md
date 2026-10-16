# Services on Prisma

## Output

`docs/prisma-services.md`

## Research

Document how to move the app's data services from the in-memory stores to Prisma (Neon PostgreSQL, schema and seed already in place), and how to add a real owner account:

1. **Services to migrate**: surveys (`src/lib/surveys/service.ts`, `list.ts`, `form-data.ts`, `public.ts`), users (`src/lib/users/service.ts`, `list.ts`), responses (`src/lib/surveys/responses.ts`) and the metrics and app context that read them (`src/lib/mock-data.ts`, `src/lib/dashboard.ts`).
2. **New owner**: a user **Miguel Rayon** (`miguel@ellyonsoft.com`, phone `+528135574189`, role `OWNER`) in a new organization **Leyinork**, where he is the only member. His password is given by the user; only its scrypt hash may be stored (in the seed), never the plain text.

The result must be detailed enough to write phase specs.

## Include

Current state:

- Every exported function of the stores and who calls it (pages, layout, Server Actions, components); which are sync today and become async.
- Where data is read in the static shell (layout `getAppContext`, list page counts) and what Cache Components requires once those reads hit the database.
- The fixed mock clock (`MOCK_NOW`) and where the app relies on it.
- How "current user / organization" works without auth.

What to define:

- The Prisma version of each service: queries, transactions (active-survey limit, bulk all-or-nothing, survey update that preserves ids and archives), error mapping (`P2002`, `P2003`), soft delete filters, `passwordHash` never leaving the server.
- Metrics with SQL aggregation (overview section 6) instead of in-memory counting; real "now" and time zone.
- Search, filters and pagination for the survey and user tables (accent-insensitive search).
- Kiosk read and submit on Prisma (nested create, snapshot, rate limit).
- Caching strategy under Cache Components (`"use cache"` + `cacheTag`, `updateTag` in actions, Suspense) so pages stay fast and writes show immediately.
- The new owner and organization: seed changes, password handling, which user the app acts as until Auth.js.
- What is deleted at the end (stores, mock), verification and phases.
- Decisions: Jordan as the default dev user, owner password stored only as a precomputed hash (no `.env` variable), search / filters / pagination in the database (`unaccent`), caching with `"use cache"` + tags + `updateTag`.

## Sources

- @src/lib/surveys/service.ts
- @src/lib/surveys/list.ts
- @src/lib/surveys/form-data.ts
- @src/lib/surveys/public.ts
- @src/lib/surveys/responses.ts
- @src/lib/users/service.ts
- @src/lib/users/list.ts
- @src/lib/users/password.ts
- @src/lib/dashboard.ts
- @src/lib/mock-data.ts
- @src/lib/seed-data.ts
- @src/actions/surveys.ts
- @src/actions/users.ts
- @src/actions/kiosk.ts
- @prisma/schema.prisma
- @prisma/seed.ts
- @src/server/prisma.ts
- @context/project-overview.md (sections 4–8)
- `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/updateTag.md`, `cacheTag.md`
