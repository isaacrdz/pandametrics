# Sidebar Collapse

Two problems with the collapsed (icon) admin sidebar:

1. The nav icons and the avatar are not centered horizontally.
2. Once collapsed, the UI offers no way to expand it again.

## 1. Current state

| Piece | File | Today |
| --- | --- | --- |
| Shell | `src/app/(app)/layout.tsx` | `SidebarProvider` with defaults (`defaultOpen` true, no style) → `AppSidebar` + `SidebarInset` |
| Sidebar | `src/components/layout/AppSidebar.tsx` | `collapsible="icon"`. Header: `Logo` (`flex-1`, tile `size-8` collapsed, wordmark hidden) + `SidebarTrigger` with `group-data-[collapsible=icon]:hidden`. `SidebarRail` at the edge |
| Nav | `NavMain.tsx` | `SidebarGroup px-3`, separator `mx-3`, buttons `h-11 gap-3 rounded-xl px-3 [&_svg]:size-5`, tooltips with the item name (disabled "Settings" has "Coming soon") |
| User | `NavUser.tsx` | `SidebarFooter p-3`, `SidebarMenuButton size="lg"` with `p-3`, avatar `size-10` → `size-8` collapsed |
| Primitive | `src/components/ui/sidebar.tsx` | `--sidebar-width-icon: 3rem`; collapsed menu buttons `size-8! p-2!` (`lg`: `p-0!`); `SidebarTrigger` always shows `PanelLeftIcon` + sr-only "Toggle sidebar"; `SidebarRail` is a 16px hover strip with `tabIndex={-1}`; `Cmd/Ctrl + B` toggles; the state is written to a `sidebar_state` cookie that nothing reads |
| Top bar | `TopBar.tsx` | A second `SidebarTrigger` with `md:hidden` (opens the mobile sheet) |

### Measured (1280px, collapsed, light)

| Element | Left | Width | Center | Offset from 24 |
| --- | --- | --- | --- | --- |
| Sidebar | 0 | 48 | 24 | — |
| Logo tile | 8 | 32 | 24 | 0 |
| Nav buttons (3) | 12 | 32 | 28 | +4 |
| Nav icons | 20 | 20 | 30 | **+6** |
| User avatar button | 12 | 32 | 28 | +4 |
| `SidebarTrigger` (sidebar and top bar) | — | — | — | not visible |

## 2. Why the icons are off center

Three things add up:

1. **Group padding.** `SidebarGroup` has `px-3` (12px) in both states. In a 48px rail that leaves 24px, but the collapsed button is forced to `size-8!` (32px). The button starts at 12 and ends at 44: its center is 28, not 24.
2. **Icon bigger than the button's content box.** The collapsed button keeps `p-2!` (8px), so its content box is 16px, but `BUTTON_CLASS` makes the icon 20px (`[&_svg]:size-5`). The icon starts at the left padding (20px) and overflows 4px to the right: center 30.
3. **Footer padding.** `SidebarFooter p-3` leaves 24px for a 32px avatar button: center 28.

The header uses `px-2` when collapsed (8 + 32 + 8 = 48), which is why only the logo is centered.

## 3. Why it cannot be expanded

- The only visible control is the `SidebarTrigger` in the header, and it is hidden in the collapsed state (`group-data-[collapsible=icon]:hidden`).
- The top bar trigger is `md:hidden`, so on desktop it never shows.
- What still works is undiscoverable: the `SidebarRail` (an invisible 16px strip on the sidebar edge, no focus) and `Cmd/Ctrl + B`.
- The trigger's icon and label do not change with the state ("Toggle sidebar", `PanelLeftIcon` both ways), so even when visible it does not say what it will do.

## 4. Proposed collapsed geometry

Make the rail a little wider and give every item the same 40px square, centered:

| Token / piece | Today | Proposed |
| --- | --- | --- |
| `--sidebar-width-icon` | 3rem (48px) | **4rem (64px)**, passed as `style` on `SidebarProvider` (it already spreads `style`), no edit to `sidebar.tsx` |
| Nav button, collapsed | `size-8! p-2!`, icon 20px overflows | `group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center` → 40px, icon 20px centered |
| `SidebarGroup` | `px-3` | `px-3` (64 − 24 = 40, the button fits exactly) |
| Separator | `mx-3` | `mx-3` (40px line under 40px buttons) |
| Header, collapsed | `px-2`, logo 32px | `px-3`, logo tile `size-10` (same as expanded, no resize jump) |
| Footer, collapsed | `p-3`, avatar 32px in 24px | `p-3`, button `size-10! p-0! justify-center`, avatar `size-10` (same as expanded) |
| Active dot | hidden collapsed | unchanged |

Every item then spans 12–52 with its center at 32, the center of the 64px rail. The logo and the avatar keep their expanded size, so collapsing only hides text instead of shrinking things.

Why 4rem instead of keeping 3rem with 32px buttons: the app uses 20px icons and a 40px logo and avatar everywhere else. At 3rem they would need to shrink to 16px icons and a 32px logo and avatar to fit with padding, which looks cramped next to the 80px top bar. The extra 16px only applies while collapsed.

Expanded state: no change.

## 5. Expand / collapse control

### Placement

| State | Header layout | Control |
| --- | --- | --- |
| Expanded | Row: logo + wordmark on the left, button on the right (as today) | `PanelLeftCloseIcon`, label "Collapse sidebar" |
| Collapsed | Column: logo tile, then the button under it, both centered | `PanelLeftOpenIcon`, label "Expand sidebar" |

- Header: `flex items-center gap-3 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2`.
- The button keeps `size-10 rounded-xl` in both states so it lines up with the nav buttons.
- Tooltip with the same label on the right side, only when collapsed (in the expanded state the label is next to nothing, so a tooltip helps too; recommend showing it in both).

Alternatives considered:

- **Logo turns into the expand button on hover** (as in some chat apps): compact, but the logo is a link to the dashboard, and a control that only appears on hover is hard to find and does not work on touch. Not recommended.
- **Trigger in the top bar on desktop too**: always visible, but far from the sidebar and it duplicates the header control when expanded. Not recommended.
- **Rail only**: invisible and not focusable. Keep it as a mouse extra, not as the control.

### Component

A small client `SidebarToggle` in `src/components/layout/` (not an edit of the shadcn primitive, so registry updates stay easy):

- reads `state` and `toggleSidebar` from `useSidebar()`;
- `Button variant="ghost" size="icon"` with `aria-expanded={state === "expanded"}` and `aria-controls` pointing at the sidebar container id (or just `aria-expanded`, since the sidebar has no id today);
- icon and label switch with the state;
- `Tooltip` (`side="right"`) with the label and the shortcut hint (`⌘B` / `Ctrl+B`), the shortcut text in a `kbd`;
- replaces the header `SidebarTrigger`. The top bar keeps its `md:hidden` `SidebarTrigger` for the mobile sheet.

### Focus

- The toggle stays mounted in both states (only its icon and label change), so focus stays on it after clicking. No focus management needed.
- `Cmd/Ctrl + B` keeps working from anywhere (built into `SidebarProvider`).

## 6. Remembering the state

Today a reload always opens the sidebar expanded (the cookie is written, `defaultOpen` is never set).

- Reading the cookie in `(app)/layout.tsx` (`cookies()`) would make every admin route dynamic and break the static shells kept with `cacheComponents` (`/dashboard` and `/surveys` are partial prerenders). Not recommended.
- Same pattern as the language: `localStorage` (`panda-metrics:sidebar`) read on the client, plus a tiny inline script that sets `data-sidebar-collapsed` on `<html>` before paint, with CSS that applies the collapsed width until React takes over. Doable, but it touches the primitive's state handling.
- **Recommendation**: keep it out of this change. Collapse is a per-session preference today; persisting it is a separate, small feature if the team wants it. Mention it in the overview's backlog.

## 7. Accessibility

- **Logo name when collapsed**: the wordmark is `hidden` (`display: none`) and the image `alt` is `""`, so the link has no accessible name. Fix: hide the wordmark with `sr-only` instead of `hidden` when collapsed (`group-data-[collapsible=icon]:sr-only`), so screen readers still read "Panda Metrics".
- **Tooltips on disabled items**: "Settings" is a disabled button; disabled buttons do not fire pointer events, so its "Coming soon" tooltip may never show when collapsed. Check it, and if it does not show, render it with `aria-disabled` instead of `disabled` (still not clickable), as shadcn recommends for tooltips on disabled controls.
- Nav tooltips already use the item name; keep them.
- Visible focus ring on the toggle and on the 40px buttons in both themes.

## 8. i18n

Add to `a11y` in `en.json` / `es.json`:

| Key | en | es |
| --- | --- | --- |
| `a11y.expandSidebar` | Expand sidebar | Expandir menú |
| `a11y.collapseSidebar` | Collapse sidebar | Contraer menú |

`a11y.toggleSidebar` stays (the rail and the mobile trigger use it). The shortcut hint is symbols only (`⌘B` / `Ctrl B`), allowed by `jsx-no-literals` only if added to `allowedStrings` or built from a constant; prefer a constant.

## 9. Files

| Action | File |
| --- | --- |
| New | `src/components/layout/SidebarToggle.tsx` |
| Change | `src/app/(app)/layout.tsx` (`style={{ "--sidebar-width-icon": "4rem" }}` on `SidebarProvider`) |
| Change | `AppSidebar.tsx` (header layout per state, `SidebarToggle`, collapsed paddings) |
| Change | `NavMain.tsx` (`BUTTON_CLASS` collapsed size, padding, centering) |
| Change | `NavUser.tsx` (collapsed button and avatar size) |
| Change | `src/components/brand/Logo.tsx` only if needed for the `sr-only` wordmark (it already accepts `wordmarkClassName`) |
| Change | `src/messages/en.json`, `es.json` |
| No change | `src/components/ui/sidebar.tsx`, `TopBar.tsx` |

## 10. Verification

- `yarn lint`, `tsc --noEmit`, `yarn build` (admin routes keep their partial prerender).
- Measure collapsed centers at 1280 (as in section 1): logo, toggle, every nav button and icon, avatar all at the rail center (32px), in light and dark.
- Collapse with the header button → expand with the same button; label, icon and `aria-expanded` change each time; focus stays on the button.
- `Cmd/Ctrl + B` and the rail still toggle.
- Tooltips show on hover and focus when collapsed (nav items, toggle, "Coming soon" on Settings).
- Screen reader name on the collapsed logo ("Panda Metrics").
- Mobile (< 768px): the sheet opens from the top bar trigger as before; no toggle changes there.
- No horizontal overflow at 768, 1024 and 1280 in both states (the collapsed rail is 16px wider; the dashboard and table use container queries, so they adapt).

## 11. Recommendation

One small spec, **Sidebar Collapse**:

1. `--sidebar-width-icon: 4rem` and 40px collapsed items (nav, logo, avatar) centered in the rail.
2. `SidebarToggle` in the header, visible in both states, with state-specific icon, label, tooltip and `aria-expanded`; header stacks when collapsed.
3. `sr-only` wordmark when collapsed; check the disabled tooltip.
4. New `a11y` messages.
5. Leave persistence across reloads for later.
