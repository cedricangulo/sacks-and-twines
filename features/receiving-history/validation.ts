import type { Doc, Id } from "@/convex/_generated/dataModel"

/**
 * A batch (stock-in) record as returned by `batches.queries.listHistory`.
 *
 * `productName`, `productSku`, `supplierName` and `receivedBy` are always
 * resolved strings on this query: it reads the denormalized columns when present
 * and falls back to the live documents otherwise, so callers never have to
 * handle `undefined`.
 */
export interface ReceivingBatch extends Doc<"batches"> {
  _id: Id<"batches">
  createdAt: number
  productName: string
  productSku: string
  supplierName: string
  receivedBy: string
}
