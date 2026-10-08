import type { Doc } from "@/convex/_generated/dataModel"

// A dispatch-item record enriched with product name, SKU, batch code, base UOM, and line total.
export interface DispatchItem extends Doc<"dispatchItems"> {
  productName: string
  productSku: string
  batchCode: string
  baseUom: string
  conversionFactor?: number
  lineTotal: number
}
