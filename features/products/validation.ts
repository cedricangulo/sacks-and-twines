import type { Id } from "@/convex/_generated/dataModel"

export interface DispatchBatch {
  _id: Id<"batches">
  batchCode: string
  quantityRemaining: number
  unitCost: number
  _creationTime: number
}

export interface DispatchReadyProduct {
  _id: Id<"products">
  _creationTime: number
  skuCode: string
  name: string
  category: "sacks" | "twines"
  baseUom: "piece" | "roll"
  weightPerUnit?: number
  currentQuantity: number
  totalAssetValue: number
  lowStockThreshold: number
  status: "active" | "archived"
  imagePath?: string
  lastSupplierId?: Id<"suppliers">
  imageUrl?: string
  availableBatches: DispatchBatch[]
}
