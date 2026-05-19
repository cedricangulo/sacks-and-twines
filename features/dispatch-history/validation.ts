import type { Doc, Id } from "@/convex/_generated/dataModel"

export interface Dispatch extends Doc<"dispatches"> {
  userName: string
  itemCount: number
}

export interface DispatchItem extends Doc<"dispatchItems"> {
  productName: string
  productSku: string
  batchCode: string
  lineTotal: number
}
