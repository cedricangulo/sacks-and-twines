import type { Doc, Id } from "@/convex/_generated/dataModel"

/** A dispatch record enriched with user name and item count from the Convex query. */
export interface Dispatch extends Doc<"dispatches"> {
  userName: string
  itemCount: number
}

/** A dispatch-item record enriched with product name, SKU, batch code, and line total. */
export interface DispatchItem extends Doc<"dispatchItems"> {
  productName: string
  productSku: string
  batchCode: string
  lineTotal: number
}
