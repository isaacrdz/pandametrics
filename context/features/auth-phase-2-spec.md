# Auth Phase 2 — Credentials (Email / Password) and Registration

## Overview

Phase 2 of 3. Add the Credentials provider (email and password) and an open registration that creates the user's organization. Passwords keep the app's **scrypt** format (`src/lib/users/password.ts`), so every existing hash (demo users, the owner) keeps working. No bcryptjs.

Full research: `docs/auth.md` (sections 4.1–4.5).

## Requirements

### Credentials provider (split pattern)

- `src/auth.config.ts`: `Credentials({ authorize: () => null })` as a placeholder (no Prisma there).
- `src/auth.ts` overrides it with the real `authorize`:
  1. Validate `{ email, password }` with Zod (lowercased, trimmed email).
  2. Find the user by email with `passwordHash` (server only). Reject if the user is missing, inactive, soft-deleted or has no organization.
  3. `verifyPassword(password, passwordHash)`. A Google-only user (`passwordHash = null`) always fails.
  4. Return `{ id, name, email, image }`, never the hash.
- Credentials needs the JWT strategy (already set in phase 1).
- **Rate limit** on sign-in attempts per IP + email, reusing the kiosk limiter pattern (`src/lib/kiosk/rate-limit.ts`; in memory, one process). Too many attempts fail like a wrong password.
- No difference between "unknown email" and "wrong password" (no account enumeration).

### Registration

`POST /api/v1/auth/register`. `/api/auth/*` is Auth.js's catch-all; the overview puts the API under `/api/v1`.

- **Accepts** `name`, `email`, `password`, `confirmPassword`, `organizationName`.
- **Validates** with Zod, reusing the user form rules (name, normalized email, password rules) plus:
  - `confirmPassword` must match;
  - `organizationName` is required, 1–80 characters.
- **One transaction** creates:
  - the organization (`organizationName`);
  - the user: `OWNER`, active, scrypt `passwordHash`, `emailVerified: null`, `organizationId`.
- **Errors**: a taken email (unique index, `P2002`) → `EMAIL_TAKEN`; invalid input → `VALIDATION` with field errors.
- **Responses** follow the overview format: `{ success: true, data: { id } }` or `{ success: false, error: { code, fieldErrors? } }`. Codes only; the client translates them.
- **Rate limit** per IP.
- The registered email is unverified. If the real owner of that email later signs in with Google, phase 1 links the account, clears the password and sets `emailVerified`. Email verification on register is later hardening.

## Testing

1. Register via curl:

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"password123","confirmPassword":"password123","organizationName":"Test Org"}'
```

2. In Neon: the organization "Test Org" and its `OWNER` user exist, and `passwordHash` is in the `salt:hash` format.
3. Same email again → `EMAIL_TAKEN`. Mismatched passwords or no organization name → `VALIDATION`.
4. `/api/auth/signin` with test@test.com → `/dashboard` of "Test Org" (empty).
5. Jordan with `panda-dev-1` → Acme. A wrong password → error. A deactivated user → error.
6. Repeated wrong attempts → limited.
7. Google OAuth still works (phase 1). A Google account with the email of an unverified registered user → linked, and the old password no longer works.

## References

- @docs/auth.md
- @src/lib/users/password.ts
- @src/lib/users/schema.ts
- Credentials provider: https://authjs.dev/getting-started/authentication/credentials
