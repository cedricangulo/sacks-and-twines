// Maps each adjustment direction to the set of valid reason options the user can pick from.
export const REASONS_BY_DIRECTION: Record<
  "add" | "deduct",
  { value: string; label: string; description: string }[]
> = {
  add: [
    {
      value: "recount",
      label: "Recount",
      description: "Inventory recount correction",
    },
    {
      value: "system_reversal",
      label: "System Reversal",
      description: "Reversal of system error",
    },
  ],
  deduct: [
    {
      value: "damaged",
      label: "Damaged",
      description: "Products damaged in storage",
    },
    { value: "lost", label: "Lost", description: "Products lost or missing" },
    {
      value: "recount",
      label: "Recount",
      description: "Inventory recount correction",
    },
    {
      value: "system_reversal",
      label: "System Reversal",
      description: "Reversal of system error",
    },
  ],
}
