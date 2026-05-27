/** Converts a snake_case action string to Title Case (e.g. "stock_adjusted" → "Stock Adjusted"). */
export function formatAction(action: string): string {
  if (!action) return action
  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}
