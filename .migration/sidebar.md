# sidebar

2026-07-24, golden pair via CLI, **complete**

## Changed

- `components/ui/sidebar.tsx` — overwritten via `shadcn add sidebar --overwrite`; restored SidebarIcon `weight="fill"`; uses `useRender` + `mergeProps` for Slot-based components
- `components/app-sidebar.tsx` — `SidebarMenuButton asChild` → `render` (×2: header logo link and nav items)

## Left alone

(none)

## Behavior changes

- Sidebar uses `data-open`/`data-closed` presence attrs instead of Radix `data-state`
- Transition animations use `data-starting-style`/`data-ending-style` instead of CSS `data-[state=open]`

## Verify by hand

- Sidebar collapses/expands on mobile and desktop
- Navigation links work correctly
- Active state highlighting works
