# Remove the Next.js Dev Indicator

How to remove the floating round "N" button that Next.js shows in the bottom-left corner while running `yarn dev`, and what the project gives up by hiding it.

## 1. Current state

- The button is the Next.js **dev indicator**, the entry point to the Next.js Devtools.
  - It only renders under `next dev`. The docs describe it as the "on-screen indicator … during development", and it is part of the development overlay.
  - `yarn build` / `next start` never ship it, so production users have never seen it.
- **Where it gets in the way** (bottom-left, the default position):
  - **Landing (`/`):** at 375px and 768px it sits over the hero, next to the panda frame. It appeared in every verification screenshot of the landing phases.
  - **Admin (`/dashboard`, `/surveys/*`):** it sits next to the bottom of the sidebar.
- **`next.config.ts` today:**

  ```ts
  const nextConfig: NextConfig = {
    /* config options here */
    experimental: {
      agentFeedback: false,
    },
    cacheComponents: true,
    partialPrefetching: true,
    turbopack: { rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } } },
  };

  export default withNextIntl(nextConfig);
  ```

  - It has no `devIndicators` key, so the default `{ position: "bottom-left" }` applies (`config-shared.d.ts`).
  - `experimental.agentFeedback` is unrelated: it manages the AI-agent issue report block in `AGENTS.md`, not the on-screen indicator.
- **References in the docs:** nothing in `context/` or `docs/` mentions the indicator, so no document needs updating.

## 2. Options (Next.js 16)

From `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/devIndicators.md` and the types in `next/dist/server/config-shared.d.ts`:

```ts
devIndicators?: false | {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right"; // default "bottom-left"
};
```

### `devIndicators: false`: hide it

- The indicator disappears on every route.
- **Errors still surface.** The docs say "Next.js will still surface any compile or runtime errors that were encountered": the error overlay keeps opening for build and runtime errors.
- **What is lost:**
  - the route badge that says whether the current route is static or dynamic;
  - the Devtools menu (route info, preferences).
- **Replacement for the static/dynamic check:** `yarn build` (or `next build --debug`) prints the route table.
  - `○` means static (prerendered), `◐` partial prerender (static shell with streamed dynamic parts, as `/dashboard` with `cacheComponents`) and `ƒ` dynamic.
  - The project already relies on this table to confirm that `/` stays static (landing phases 3 and 4).

### `devIndicators: { position }`: move it

| Corner | Landing (`/`) | Admin | Free? |
| ------ | ------------- | ----- | ----- |
| `bottom-left` (default) | over the hero on phones and tablets | bottom of the sidebar | ✗ |
| `bottom-right` | over the hero visual and the CTA banner on phones | the sonner `Toaster` is already at `position="bottom-right"` (`src/app/layout.tsx`), so toasts and the indicator would overlap | ✗ |
| `top-left` | over the logo in the sticky nav | over the sidebar logo | ✗ |
| `top-right` | over the menu button / "Create account" in the sticky nav | over the language switcher and user menu in the top bar | ✗ |

No corner is free in both layouts, so moving the indicator only moves the problem.

### Options removed in v16

`appIsrStatus`, `buildActivity` and `buildActivityPosition` were removed in v16 (deprecated since 15.2), according to the upgrading guide, section "`devIndicators` Options". The project uses none of them.

## 3. Per developer or for the whole team

- **Committed `devIndicators: false` (recommended).**
  - The team never uses the Devtools menu.
  - The indicator covers the UI in every screenshot and review.
  - The static/dynamic check is already done with the build table.
- **Per developer (not recommended now).** Read an env var in `next.config.ts`:

  ```ts
  devIndicators: process.env.PANDA_DEV_INDICATOR === "true" ? {} : false,
  ```

  It adds a variable to document for a feature nobody asked for. If someone needs the Devtools later, it can be added then, or they can toggle the line locally.

## 4. Implementation

The change in `next.config.ts` goes inside the existing object and stays wrapped by `withNextIntl`:

```ts
const nextConfig: NextConfig = {
  // Hide the floating Next.js button in development (errors still open the overlay).
  // Check static vs dynamic routes in the `yarn build` route table (○ static, ◐ partial, ƒ dynamic).
  devIndicators: false,
  experimental: {
    agentFeedback: false,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: { /* unchanged */ },
};
```

- Drop the leftover `/* config options here */` boilerplate comment in the same edit.
- **Restart `yarn dev`.** Next.js watches `next.config.ts` and restarts the server by itself when it changes. If the button is still there, stop and start `yarn dev` by hand, then do a hard refresh in the browser, because the old overlay script can stay in the open tab.
- Nothing else changes: no component, message, token or route is involved.

## 5. Verification

1. After restarting `yarn dev`, there is no floating button at 375px and 1280px on `/` and on `/dashboard`.
2. **Errors still show:**
   - Temporarily add `throw new Error("test")` to a Client Component's render, for example `CtaBanner`.
   - The Next.js error overlay must open.
   - Revert the change.
3. `yarn lint`, `tsc` and `yarn build` pass, and the build route table is unchanged (`○ /`, `○ /surveys/new`, …).

## 6. Recommendation

- **Hide it** with `devIndicators: false`, committed for the whole team.
  - It covers the landing hero and the sidebar.
  - No corner is free: the bottom right belongs to the toasts and the top corners to the navigation bars.
  - Error reporting is not affected, and the build table already answers "static or dynamic?".
- **No spec or feature branch needed.** It is a one-line config change with no UI, messages or tests. Make it a single commit on `main`, for example:

  ```text
  chore: hide the Next.js dev indicator
  ```

  If you prefer to keep the workflow uniform, an inline `/feature load "hide the Next.js dev indicator"` also works, but it adds a branch and a reset commit for one line.
