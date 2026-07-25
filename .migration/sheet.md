# sheet

2026-07-24, golden pair via CLI, **complete**

## Changed

- `components/ui/sheet.tsx` — overwritten via `shadcn add sheet --overwrite`; restored XIcon `weight="bold"`; uses `@base-ui/react/dialog` (Root, Trigger, Backdrop, Popup, Close, Title, Description)
- `features/dispatches/components/mobile-queue-sheet.tsx` — `SheetTrigger asChild` → `render`

## Left alone

(none)

## Behavior changes

- Uses `Backdrop`/`Popup` (not `Overlay`/`Content`) matching dialog pattern
- Animation uses `data-starting-style`/`data-ending-style` for slide-in/out

## Verify by hand

- Mobile queue sheet opens/closes
- Sheet slides in from correct side
- Backdrop dismisses sheet on click
