# Report Exports — Expected Output Reference

Reference for what each report export produces, so exports can be verified without
literally downloading. Sources of truth:

- Export queries: `convex/reports/queries.ts`
- Column map (labels + order + required): `features/reports/constants.ts` (`EXPORT_COLUMN_MAP`)
- CSV build + timestamp formatting: `features/reports/hooks/use-report-export.ts`

## Common behavior

- Every export query is owner-gated (`caller.role !== "owner"` → `Unauthorized`).
- Every export takes `startMs`/`endMs` (inclusive) except `exportSuppliers`, which
  filters by `_creationTime`.
- Export query must be triggered with the dialog open; it is a one-shot
  `convex.query()` (not a subscription).
- CSV output: column order = `EXPORT_COLUMN_MAP[entity]` order. Only columns whose
  `id` is `"date"` or `"createdAt"` get timestamp formatting; everything else is
  written raw.
- Timestamp format (`en-PH`): `Aug 14, 2026, 6:12 PM`.
- File name: `<entity>-<yyyy-mm-dd>.csv`.

## Products — `exportProducts`

Header (default order): `SKU Code, Name, Category, Base UoM, Status, Current Quantity, Total Asset Value, Low Stock Threshold, Conversion Factor, Last Supplier, Batch Count`

One row per product where `createdAt ?? _creationTime` is in range.

| Column | Source | Notes |
| ------ | ------ | ----- |
| skuCode | `product.skuCode` | required |
| name | `product.name` | required |
| category | `product.category` | |
| baseUom | `product.baseUom` | |
| status | `product.status` | |
| currentQuantity | `product.currentQuantity` | |
| totalAssetValue | `product.totalAssetValue` | |
| lowStockThreshold | `product.lowStockThreshold` | |
| conversionFactor | `product.conversionFactor` | |
| lastSupplier | most recent **active** batch's `supplier.companyName` (by `_creationTime` desc) | `""` when no active batch |
| batchCount | count of **active** batches for the product | not total batch count |

Example row (dev data):

| SKU Code | Name | Category | Base UoM | Status | Current Quantity | Total Asset Value | Low Stock Threshold | Conversion Factor | Last Supplier | Batch Count |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SKU-20250501-0010 | Sewing Thread Medium | thread | roll | active | 395 | 72206 | 20 | 1 | <newest active batch's supplier name> | <active batch count> |

## Batches — `exportBatches`

Header: `Batch Code, Product Name, Category, Status, Unit Cost, Total Cost, Qty Received, Qty Remaining, Supplier, Received By, Created At`

One row per batch where `createdAt ?? _creationTime` is in range. Names resolved at
export time via `productId`/`supplierId`/`userId` lookups.

| Column | Source |
| ------ | ------ |
| batchCode | `batch.batchCode` |
| productName | `product.name` (`""` if missing) |
| category | `product.category` (`""` if missing) |
| status | `batch.status` |
| unitCost | `batch.unitCost` |
| totalCost | `batch.totalProcurementCost` |
| qtyReceived | `batch.quantityReceived` |
| qtyRemaining | `batch.quantityRemaining` |
| supplier | `supplier.companyName` (`""` if missing) |
| receivedBy | `user.name` (`""` if missing) |
| createdAt | `batch.createdAt ?? batch._creationTime` → timestamp format |

Example row (dev data):

| Batch Code | Product Name | Category | Status | Unit Cost | Total Cost | Qty Received | Qty Remaining | Supplier | Received By | Created At |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BAT-20250501-0081 | <product name> | <category> | depleted | 130.98 | 76361.34 | 583 | 0 | <supplier name> | <user name> | Jun 13, 2026, ... |

## Suppliers — `exportSuppliers`

Header: `Company Name, Status, Contact Person, Contact Number, Address, Batch Count`

One row per supplier **where `_creationTime` is in range** (suppliers have no
`createdAt`, so range uses creation of the record itself).

| Column | Source |
| ------ | ------ |
| companyName | `supplier.companyName` |
| status | `"archived"` if `archivedAt`, else `"active"` |
| contactPerson | `supplier.contactPerson` |
| contactNumber | `supplier.contactNumber` |
| address | `supplier.address` |
| batchCount | `supplier.batchCount ?? 0` |

> Caveat: a date range that predates seeding returns 0 suppliers regardless of
> business dates.

Example row (dev data):

| Company Name | Status | Contact Person | Contact Number | Address | Batch Count |
| --- | --- | --- | --- | --- | --- |
| Cordillera Twine Traders | active | Carlos Lim | 0921-567-8905 | Baguio City, Benguet | <batch count> |

## Dispatches — `exportDispatches`

Header: `Date, Status, Customer Reference, Dispatched By, OR Number, Items Count, Total Value`

One row per dispatch (any status) where `createdAt ?? _creationTime` is in range.

| Column | Source |
| ------ | ------ |
| date | `dispatch.createdAt ?? dispatch._creationTime` → timestamp format |
| status | `dispatch.status` |
| customerRef | `dispatch.customerReference ?? ""` |
| dispatchedBy | `dispatch.userName`, fallback `user.name` lookup |
| orNumber | `dispatch.orNumber ?? ""` |
| itemCount | `dispatch.itemCount`; if 0/undefined, falls back to item count |
| totalValue | `dispatch.totalValue`; if undefined/0 items, `Σ quantityDeducted * unitCost` |

Example row (dev data):

| Date | Status | Customer Reference | Dispatched By | OR Number | Items Count | Total Value |
| --- | --- | --- | --- | --- | --- | --- |
| Aug 14, 2026, 6:12 PM | completed |  | Michael | OR-20260814-1809 | 1 | 942.6 |

## Dispatch Items — `exportDispatchItems`

Header: `Date, Status, Customer Reference, Dispatched By, OR Number, Product, Batch Code, Dispatch UoM, Dispatch Qty, Qty Deducted, Unit Cost, Line Total`

One row **per dispatch line item** (each dispatch produces N rows).

| Column | Source |
| ------ | ------ |
| date | `dispatch.createdAt ?? dispatch._creationTime` → timestamp format |
| status | `dispatch.status` |
| customerRef | `dispatch.customerReference ?? ""` |
| dispatchedBy | `dispatch.userName`, fallback lookup |
| orNumber | `dispatch.orNumber ?? ""` |
| product | `product.name` (`""` if missing) |
| batchCode | `batch.batchCode` (`""` if missing) |
| dispatchUom | `item.dispatchUom` |
| dispatchQty | `item.dispatchQuantity` |
| qtyDeducted | `item.quantityDeducted` |
| unitCost | `item.unitCost` |
| lineTotal | `item.quantityDeducted * item.unitCost` |

Example rows (dev data — dispatch `OR-20260814-7275`, verified item-level):

| Date | Status | Customer Reference | Dispatched By | OR Number | Product | Batch Code | Dispatch UoM | Dispatch Qty | Qty Deducted | Unit Cost | Line Total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Aug 14, 2026, 9:20 AM | completed |  | Michael | OR-20260814-7275 | Red bag | BAT-20250501-0038 | piece | 7 | 7 | 59.68 | 417.76 |
| Aug 14, 2026, 9:20 AM | completed |  | Michael | OR-20260814-7275 | Sewing Thread Small | BAT-20250501-0068 | roll | 3 | 3 | 187.36 | 562.08 |
| Aug 14, 2026, 9:20 AM | completed |  | Michael | OR-20260814-7275 | Sewing Twine | BAT-20250501-0046 | meter | 26.36 | 26.36 | 157.1 | 4141.156 |

> Line total sum (`5120.996`) exactly matches this dispatch's denormalized `totalValue`.

> Expect many more rows than dispatch count (10+ item rows per dispatch).

## Stock Adjustments — `exportAdjustments`

Header: `Date, Product, Status, Batch Code, Reason, Quantity Adjusted, Adjusted By`

One row per adjustment where `createdAt ?? _creationTime` is in range.

| Column | Source |
| ------ | ------ |
| date | `adjustment.createdAt ?? adjustment._creationTime` → timestamp format |
| product | `product.name` (`""` if missing) |
| status | `adjustment.status` |
| batchCode | `batch.batchCode` (`""` if missing) |
| reason | `adjustment.reason` |
| quantityAdjusted | `adjustment.quantityAdjusted` |
| adjustedBy | `user.name` (`""` if missing) |

Example row (dev data):

| Date | Product | Status | Batch Code | Reason | Quantity Adjusted | Adjusted By |
| --- | --- | --- | --- | --- | --- | --- |
| May 22, 2026, 6:12 PM | Sewing Thread Medium | applied | BAT-20250501-0075 | lost | 16 | <user name> |

## Monthly Report — `exportMonthlyReport` (PDF)

Single composite query; drives the PDF. Returns:

- `dispatchCount`, `adjustmentCount`
- `totalItems` (Σ itemCount / item-row fallback), `totalValue` (Σ `quantityDeducted * unitCost`)
- `dispatchesPerDay` — map `YYYY-MM-DD → count` (`toLocaleDateString("en-CA")`)
- `categoryBreakdown` — `{ sacks, twines }` counts from dispatch item product categories
- `adjustmentsByReason` — map `reason → count`
- `lowStockProducts` — active products with `currentQuantity < lowStockThreshold`
  (`name`, `skuCode`, `currentQuantity`, `lowStockThreshold`)
- `topProducts` — active products sorted by `currentQuantity` desc, top 5 (`name`, `skuCode`, `currentQuantity`)
- `dispatches` — full item-level rows (`productName`, `productCategory`, `batchCode`,
  `dispatchUom`, `dispatchQty`, `qtyDeducted`, `unitCost`, `lineTotal`, `dispatchDate`,
  `dispatchStatus`, `customerRef`, `dispatchedBy`)
- `adjustments` — rows (`date`, `product`, `productCategory`, `status`, `batchCode`,
  `reason`, `quantityAdjusted`, `adjustedBy`)
- `productCount` (active products), `supplierCount` (non-archived suppliers)

## Verification notes

- Export queries require an authenticated owner session, so they can't be invoked
  from the CLI (`convex run` → `Unauthorized`). Verify against the column specs
  above plus `pnpm convex data <table> --limit 5 --format json` for real values.
- Denormalized `totalQuantity`/`totalValue`/`itemCount` on dispatches and
  `batchCount` on products/suppliers are now backfilled on dev (migrations ran), so
  fallback recomputation branches are cold paths.
