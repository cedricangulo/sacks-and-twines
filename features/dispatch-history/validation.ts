import type { Doc, Id } from "@/convex/_generated/dataModel"

// A dispatch record enriched with user name, item count, and total quantity from the Convex query.
export interface Dispatch extends Doc<"dispatches"> {
  userName: string
  itemCount: number
  totalQuantity?: number
}

// A dispatch-item record enriched with product name, SKU, batch code, base UOM, and line total.
export interface DispatchItem extends Doc<"dispatchItems"> {
  productName: string
  productSku: string
  batchCode: string
  baseUom: string
  conversionFactor?: number
  lineTotal: number
}
