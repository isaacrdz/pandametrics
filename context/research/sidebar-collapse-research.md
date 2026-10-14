# Sidebar Collapse

## Output

`docs/sidebar-collapse.md`

## Research

Document how to fix the collapsed (icon) sidebar of the admin:

1. **Icons are not centered horizontally** when the sidebar is collapsed (screenshot from the user: nav icons and the avatar sit to the right of the logo).
2. **Once collapsed, it cannot be expanded again** from the UI: the toggle button disappears. The collapse control must work both ways: make the sidebar narrow and bring it back to its full mode.

The result must be detailed enough to write one feature spec.

## Include

Current state:

- `AppSidebar` (`collapsible="icon"`): header with `Logo` + `SidebarTrigger` (the trigger is `group-data-[collapsible=icon]:hidden`), `NavMain`, `NavUser`, `SidebarRail`.
- `NavMain`: `SidebarGroup className="px-3"`, `BUTTON_CLASS` with `h-11 px-3 [&_svg]:size-5`, separators `mx-3`.
- `NavUser`: `SidebarMenuButton size="lg"` inside `SidebarFooter className="p-3"`, avatar `size-10` / `size-8` collapsed.
- shadcn `sidebar.tsx`: `--sidebar-width-icon: 3rem`, collapsed menu buttons forced to `size-8! p-2!` (`lg`: `p-0!`), rail hidden from keyboard (`tabIndex={-1}`), `Cmd/Ctrl + B` shortcut, trigger with a fixed `PanelLeftIcon` and "Toggle sidebar" text, state cookie written but never read.
- `TopBar` has a second `SidebarTrigger` only below `md` (mobile sheet).
- Measured positions with the sidebar collapsed at 1280px (sidebar 48px wide, center 24px): logo center 24, nav buttons center 28, nav icons center 30, avatar center 28. Both triggers not visible.
- Collapsed `Logo` link: the wordmark is `display: none` and the image `alt` is empty, so the link has no accessible name.

What to define:

- Why the icons shift (padding, forced button size, icon size) with the numbers.
- The collapsed geometry: width of the rail, button size, icon size, paddings for header, groups, separators and footer, so every item is centered.
- Where the expand / collapse control lives in each state, its icon and label per state, `aria-expanded`, tooltip, keyboard shortcut and the rail.
- Whether the collapsed state should survive a reload (cookie / `localStorage`, Cache Components constraints).
- Accessibility: logo name when collapsed, tooltips on disabled items, focus after toggling.
- i18n keys, dark mode, mobile (sheet) unaffected.
- Verification steps.

## Sources

- @src/components/layout/AppSidebar.tsx
- @src/components/layout/NavMain.tsx
- @src/components/layout/NavUser.tsx
- @src/components/layout/TopBar.tsx
- @src/components/brand/Logo.tsx
- @src/components/ui/sidebar.tsx
- @src/app/(app)/layout.tsx
- @src/messages/en.json
