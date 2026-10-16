# Auth Phase 3 — Sign In, Register, Profile and Users UI

## Overview

Phase 3 of 3. Replace the Auth.js default pages with custom ones, connect the landing, finish the account pieces in the sidebar and the profile, and replace user creation with "Invite user" (coming soon).

Full research: `docs/auth.md` (sections 4 and 5.4).

## Requirements

### Sign In page (`/sign-in`)

- Public route outside the admin layout, in the app's style: logo, language switcher, light and dark.
- Email and password fields (existing form patterns: Zod, `PasswordInput` with the show toggle).
- A **"Continue with Google"** button following Google's branding: the "G" logo, white / outlined button.
- Link to `/register`.
- Form validation and error display. Errors from `?error=` mapped to translated messages:
  - `CredentialsSignin` → wrong email or password;
  - `AccessDenied`, `OAuthAccountNotLinked`, `Configuration`;
  - a default message for anything else.
- Respects `callbackUrl` (same-origin paths only), default `/dashboard`.
- Set `pages: { signIn: "/sign-in", error: "/sign-in" }` in `auth.config.ts`. The proxy and the sign-out action redirect here.

### Register Page (`/register`)

- Name, email, password, confirm password and **organization name** fields.
- Form validation (passwords match, email format, password rules) and server field errors (`EMAIL_TAKEN`).
- Submits to `POST /api/v1/auth/register` (phase 2).
- On success, redirect to `/sign-in` with a "Account created, sign in" message.
- A "Continue with Google" button too (Google sign-up creates the organization automatically).

### Sidebar user menu (`NavUser`)

- Avatar (Google `image` or initials, via `UserAvatar`) and name.
- The avatar opens the menu: **My profile** (`/profile`), the theme toggle and **Sign out** (phase 1).

### Profile (`/profile`)

- **Sign out** button in `ProfilePictureCard` (phase 1).
- **Google-only users** (`passwordHash = null`): the password section becomes **"Set a password"** (new + confirm, no current password).
  - The profile data carries a `hasPassword` boolean, never the hash.
  - `updateProfile` accepts setting a first password without the current one only when there is none.

### Users list (`/users`)

- The top-bar **"New user"** button becomes **"Invite user"**:
  - disabled, with a "Coming soon" tooltip (`aria-disabled`, like Settings in the sidebar);
  - an icon such as `UserPlus` / `MailPlus`.
- **Remove the create flow**:
  - `/users/new`;
  - the `create` mode of `UserForm` (`user-form-modes.ts`);
  - the `createUser` action and service function;
  - the create-only messages.
- **Kept**: editing users (`/users/[id]`), the list, filters and bulk actions.

### Landing

`LANDING_LINKS`:

- `signIn` → `/sign-in`;
- `signUp` → `/register`;
- `start` → `/dashboard` (signed-out visitors are sent to sign-in by the proxy).

### Copy

An `auth` namespace in `src/messages/en.json` / `es.json` (key parity check in `yarn lint`).

## Notes

### Avatar logic

- If the user has `image` (from Google, or later an upload): use it.
- Otherwise use the initials of the name (e.g. "Miguel Rayon" → "MR").
- `UserAvatar` already handles both cases; reuse it, no new component.

## Testing

1. `/sign-in` renders the custom page (en / es, light / dark, 375 / 768 / 1280, no overflow).
2. Sign in with Google → flow works, back to `callbackUrl`.
3. Sign in with email / password → flow works; a wrong password shows the error.
4. `/register` → create an account with an organization → redirect to `/sign-in` with the message → sign in → empty dashboard of the new organization.
5. The sidebar shows the avatar (Google photo or initials). The menu has My profile, the theme toggle and Sign out.
6. Sign out from the menu and from `/profile` → back to `/sign-in`.
7. A Google-only user sees "Set a password" in `/profile`, sets one, then signs in with email / password.
8. `/users`: "Invite user" is disabled with "Coming soon"; `/users/new` is a 404; editing a user still works.
9. Landing buttons go to `/sign-in` / `/register` / `/dashboard`.
10. `yarn lint`, `tsc --noEmit`, `yarn build`.

## References

- @docs/auth.md
- @src/components/layout/NavUser.tsx
- @src/components/users/ProfilePictureCard.tsx
- @src/components/layout/NewUserButton.tsx
- @src/components/users/form/user-form-modes.ts
- @src/components/landing/landing-links.ts
- Google sign-in branding: https://developers.google.com/identity/branding-guidelines
