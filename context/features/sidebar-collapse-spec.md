# Sidebar Collapse Spec

## Overview

Fix the collapsed (icon) admin sidebar:

- center every item horizontally (today the nav icons sit 6px and the avatar 4px right of the rail center);
- one control that collapses the sidebar and expands it back, visible in both states (today the toggle disappears once collapsed).

Full research in `docs/sidebar-collapse.md`.

## Decisions (from the research)

- **Collapsed rail of 4rem (64px)** instead of 3rem, set as `--sidebar-width-icon` on `SidebarProvider`. Logo, nav buttons, toggle and avatar are all 40px squares centered in it; collapsing only hides text, nothing shrinks.
- **New `SidebarToggle`** in the sidebar header, always visible: next to the logo when expanded, under it when collapsed. Icon, label and `aria-expanded` follow the state.
- **No edits to `src/components/ui/sidebar.tsx`** (shadcn primitive). The rail, `Cmd/Ctrl + B` and the mobile trigger in the top bar stay as they are.
- **No persistence across reloads** in this change (reading the cookie on the server would make the admin routes dynamic).

## Requirements

### Collapsed geometry

- `src/app/(app)/layout.tsx`: `SidebarProvider style={{ "--sidebar-width-icon": "4rem" } as CSSProperties}`.
- `NavMain` `BUTTON_CLASS`: add `group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center` (icon stays `size-5`). `SidebarGroup px-3` and separator `mx-3` stay.
- `NavUser`: collapsed button `size-10! p-0! justify-center`, avatar keeps `size-10` (drop the `size-8` collapsed override); text and chevron hidden as today.
- `AppSidebar` header: `px-3` in both states; logo tile keeps `size-10` (drop `group-data-[collapsible=icon]:size-8`).
- Expected result at 1280px collapsed: the centers of the logo, toggle, every nav button and icon, and the avatar are at 32px.

### Toggle (`src/components/layout/SidebarToggle.tsx`)

- Client component using `useSidebar()` (`state`, `toggleSidebar`).
- `Button variant="ghost" size="icon"`, `size-10 rounded-xl text-muted-foreground hover:text-foreground`, visible focus ring.
- Expanded: `PanelLeftCloseIcon`, label `a11y.collapseSidebar`. Collapsed: `PanelLeftOpenIcon`, label `a11y.expandSidebar`. Label as `aria-label`; `aria-expanded={state === "expanded"}`.
- `Tooltip` (`side="right"`) with the label and the shortcut (`⌘B` on Apple platforms, `Ctrl B` elsewhere) in a `kbd`; the shortcut text comes from a constant (`jsx-no-literals`).
- Stays mounted in both states so focus stays on it after toggling.

### Header layout (`AppSidebar`)

- Wrapper: `flex items-center gap-3 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2`.
- `Logo` + `SidebarToggle` (replaces the header `SidebarTrigger`); the logo keeps `flex-1` only when expanded.
- Wordmark hidden with `group-data-[collapsible=icon]:sr-only` instead of `hidden`, so the collapsed logo link is still named "Panda Metrics".

### Disabled item tooltip

- Check that "Settings" shows its "Coming soon" tooltip on hover and focus when collapsed. If it does not (disabled buttons get no pointer events), render it with `aria-disabled="true"` and no click target instead of `disabled`, keeping the muted look.

### Messages

- Add to `a11y` in `en.json` / `es.json`: `expandSidebar` ("Expand sidebar" / "Expandir menú"), `collapseSidebar` ("Collapse sidebar" / "Contraer menú"). Keep `toggleSidebar` (rail and mobile trigger).

## Verification

- `yarn lint`, `tsc --noEmit`, `yarn build` (admin routes keep their partial prerender).
- Collapsed at 1280px, light and dark: measured centers of logo, toggle, nav buttons, nav icons and avatar all at 32px.
- Collapse with the header button and expand with the same button; icon, label and `aria-expanded` change; focus stays on the button. `Cmd/Ctrl + B` and the rail still toggle.
- Tooltips on hover and focus when collapsed: nav items, toggle (with shortcut), "Coming soon" on Settings.
- Collapsed logo link announced as "Panda Metrics".
- Below 768px the sheet still opens from the top bar trigger; nothing changes there.
- No horizontal overflow at 768, 1024 and 1280 in both states, English and Spanish.

## References

- @docs/sidebar-collapse.md
- @src/app/(app)/layout.tsx
- @src/components/layout/AppSidebar.tsx
- @src/components/layout/NavMain.tsx
- @src/components/layout/NavUser.tsx
- @src/components/brand/Logo.tsx
- @src/components/ui/sidebar.tsx
- @src/messages/en.json
