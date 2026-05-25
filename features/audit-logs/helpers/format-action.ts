export function formatAction(action: string): string {
  if (!action) return action
  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}
