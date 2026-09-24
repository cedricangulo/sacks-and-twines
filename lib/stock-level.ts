/**
 * Single definition of the stock buckets.
 *
 * The dashboard banner, the stat tiles, the inventory and product filters and
 * the inventory table badge all classify the same `currentQuantity` against the
 * same `lowStockThreshold`. When they disagree, a chip on the dashboard can link
 * to a filtered view that does not contain the product it counted — which is how
 * a negative quantity (reachable through the adjustment path, since dispatch
 * clamps at zero) ended up in the "Low Stock" tile while matching neither
 * inventory bucket.
 */
export type StockLevel = "out_of_stock" | "low_stock" | "in_stock"

export function getStockLevel(
  currentQuantity: number,
  lowStockThreshold: number
): StockLevel {
  // `<= 0` rather than `=== 0`: an over-deducted product has no stock either
  // way, and it must land in a bucket the filters can reproduce.
  if (currentQuantity <= 0) return "out_of_stock"
  if (currentQuantity <= lowStockThreshold) return "low_stock"
  return "in_stock"
}
