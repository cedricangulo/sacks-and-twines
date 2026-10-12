// Shared table-page render state. Lives in a non-component module so
// `filtered-table-page.tsx` exports only components (Fast Refresh boundary).
export type FilteredTableState = "loading" | "forbidden" | "empty" | "ready"

// Resolves the shared table-page render cascade from three facts. Centralizing
// the nested loading/permission/empty branches keeps each page function small;
// the pages only supply their skeleton, table, and empty nodes.
export function resolveFilteredTableState({
  isLoading,
  canAccess = true,
  hasRows,
}: {
  isLoading: boolean
  canAccess?: boolean
  hasRows: boolean
}): FilteredTableState {
  if (isLoading) return "loading"
  if (!canAccess) return "forbidden"
  if (!hasRows) return "empty"
  return "ready"
}
