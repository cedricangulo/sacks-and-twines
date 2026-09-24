import { cn } from "@/lib/utils"

/**
 * Per-column alignment, set via a column's `meta` and read by the pure table
 * components when rendering `<TableHead>`.
 *
 * `components/ui/table.tsx` hardcodes `text-left align-middle` on every head, so
 * without this a right-aligned numeric column renders its header left-aligned
 * against right-aligned values. Cell renderers still set their own alignment —
 * this only governs the header, keeping the two in sync.
 */
export interface ColumnAlignmentMeta {
  align?: "left" | "right"
}

/** Tailwind class for a head cell at the given alignment. */
export function headAlignClass(meta: unknown): string | undefined {
  const align = (meta as ColumnAlignmentMeta | undefined)?.align
  return align === "right" ? "text-right" : undefined
}

/**
 * Tailwind class for the sort-toggle `<button>` inside a head cell. The button
 * is `inline-flex`, so it stays left-packed inside a right-aligned cell unless
 * it is justified explicitly.
 */
export function sortButtonAlignClass(meta: unknown): string | undefined {
  const align = (meta as ColumnAlignmentMeta | undefined)?.align
  return align === "right" ? "justify-end w-full" : undefined
}

/** Convenience for spreading onto a `<TableHead>`. */
export function headClassName(meta: unknown): string {
  return cn("text-muted-foreground", headAlignClass(meta))
}
