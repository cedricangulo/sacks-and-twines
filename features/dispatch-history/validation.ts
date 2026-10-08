import type { Doc } from "@/convex/_generated/dataModel"

// A dispatch record enriched with user name, item count, and total quantity from the Convex query.
export interface Dispatch extends Doc<"dispatches"> {
  userName: string
  itemCount: number
  totalQuantity?: number
}
