# Remove the Next.js Dev Indicator

## Output

`docs/dev-indicator.md`

## Research

Document how to remove the floating Next.js button (the round "N" in the bottom-left corner of the screen) that appears while running `yarn dev`, and what the project loses or keeps by hiding it.

## Include

Current state:

- The button is the Next.js dev indicator (Devtools). It only renders under `next dev`; confirm that it never ships in `yarn build` / `next start`.
- It is visible on every route in development:
  - on the landing (`/`) it sits over the hero at 375px and 768px;
  - on the admin (`/dashboard`, `/surveys/*`) it sits next to the bottom of the sidebar.
  - It also showed up in every verification screenshot taken during the landing phases.
- `next.config.ts` today:
  - `experimental.agentFeedback: false`;
  - `cacheComponents: true`;
  - `partialPrefetching: true`;
  - the Turbopack CSS rule;
  - wrapped by `createNextIntlPlugin`.
  - It has no `devIndicators` key.

Options, read from `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/devIndicators.md` (Next.js 16):

- `devIndicators: false`: hides the indicator entirely.
  - Confirm that compile errors and runtime errors still open the error overlay.
  - Note what is lost: the static / dynamic route badge and the Devtools menu.
  - Explain how to check static vs dynamic without it (`next build --debug`: `○` vs `ƒ`).
- `devIndicators: { position }`: moves the indicator to `bottom-right`, `top-left` or `top-right` instead of hiding it. Say whether any of those corners is free in both the landing and the admin layout.
- Options removed in v16 (`appIsrStatus`, `buildActivity`, `buildActivityPosition`): make sure none of them are used.
- Whether `devIndicators` needs to be per developer (an environment variable read in `next.config.ts`) or can be committed for the whole team.

Implementation steps:

- The exact change to `next.config.ts`, typed with `NextConfig` and kept inside the existing object passed to `withNextIntl`.
- Whether `yarn dev` must be restarted for the change to apply (config changes are not hot reloaded).
- Any references to update, for example screenshots or verification notes in `context/` that mention the indicator.

Verification:

- After restarting `yarn dev`, no floating button at 375px and 1280px on `/` and `/dashboard`.
- A deliberate runtime error still shows the Next.js error overlay. Revert it afterwards.
- `yarn lint`, `tsc` and `yarn build` pass, and the build route table is unchanged.

Recommendation: hide or move, with the reason. This is a single-line config change, so say whether it needs its own feature spec or can be a small `chore` commit.

## Sources

- @next.config.ts
- @node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/devIndicators.md
- @node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md (section "`devIndicators` Options")
- @context/project-overview.md
