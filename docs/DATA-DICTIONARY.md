# Data Dictionary — Sacks & Twines Inventory System

Scope: the eight application tables declared in `convex/schema.ts`. Tables managed by the
`@convex-dev/auth` component (`authAccounts`, `authSessions`, `authRefreshTokens`,
`authVerificationCodes`, `authVerifiers`, `authRateLimits`, `authVerificationNonces`,
`authPendingVerifications`) are framework-owned and excluded.

## Denormalized (cached) fields

Several columns duplicate data derivable from other tables so that read queries avoid a
per-row fan-out. They are written on the mutation path and by `convex/seed.ts`, and read
directly — the queries no longer carry a live fallback. Pre-existing rows must be
populated by the matching migration in `convex/migrations.ts` before deploying a read
path that trusts them (see the deploy checklist in `AGENTS.md`).

- `products.batchCount`, `products.lastSupplierId` — maintained by
  `batches.mutations.stockIn` and seed; migrated by `backfillProductBatchCounts` and
  `backfillProductLastSupplierId`.
- `suppliers.batchCount` — maintained by `stockIn` (increment/decrement on supplier
  reassignment) and seed; migrated by `backfillSuppliers`.

`createdAt` on `batches`, `dispatches`, `dispatchItems`, `stockAdjustments` and
`auditLogs` is the business timestamp (distinct from the system `_creationTime`) and is
backfilled for rows that predate the column.

## users

Data dictionary for table users. Specifies the fields associated with staff and owner
accounts.

| Field Name            | Data Type | Length | Key | Null | Default        | Description                            |
| --------------------- | --------- | ------ | --- | ---- | -------------- | -------------------------------------- |
| id                    | VARCHAR   | 32     | PK  | No   | Auto-generated | Unique identifier of the user account. |
| name                  | VARCHAR   | 255    | —   | Yes  | NULL           | Full name of the staff member.         |
| email                 | VARCHAR   | 254    | UQ  | No   | —              | Unique email used for login.           |
| role                  | ENUM      | —      | —   | Yes  | staff          | Account role: owner or staff.          |
| status                | ENUM      | —      | —   | Yes  | active         | Account status: active or deactivated. |

## products

Data dictionary for table products. Specifies the fields associated with inventory items,
their stock levels, and their asset value.

| Field Name        | Data Type | Length | Key | Null | Default        | Description                                     |
| ----------------- | --------- | ------ | --- | ---- | -------------- | ----------------------------------------------- |
| id                | VARCHAR   | 32     | PK  | No   | Auto-generated | Unique identifier of the product.               |
| skuCode           | VARCHAR   | 18     | UQ  | No   | —              | Unique stock-keeping unit code.                 |
| name              | VARCHAR   | 255    | UQ  | No   | —              | Product display name.                           |
| category          | ENUM      | —      | —   | No   | —              | Product category: sacks, twines, or thread.     |
| baseUom           | ENUM      | —      | —   | No   | —              | Base unit of measure: piece, roll, or meter.    |
| conversionFactor  | DECIMAL   | 8,3    | —   | Yes  | NULL           | Units of baseUom per roll or bundle.            |
| currentQuantity   | DECIMAL   | 12,3   | —   | No   | 0              | Current on-hand stock in baseUom.               |
| totalAssetValue   | DECIMAL   | 12,2   | —   | No   | 0              | Total value of on-hand stock.                   |
| lowStockThreshold | DECIMAL   | 12,3   | —   | No   | 0              | Low-stock alert threshold.                      |
| status            | ENUM      | —      | —   | No   | active         | Product status: active or archived.             |
| keywords          | JSON      | —      | —   | Yes  | NULL           | Search keywords (up to 12, 20 characters each). |
| imagePath         | VARCHAR   | 255    | —   | Yes  | NULL           | Storage path of the product image.              |
| batchCount        | INT       | 11     | —   | Yes  | 0              | Denormalized total batch count for the product. |
| lastSupplierId    | VARCHAR   | 32     | FK  | Yes  | NULL           | Denormalized suppliers.id of the newest batch.  |
| createdAt         | TIMESTAMP | —      | —   | Yes  | NULL           | Record creation time.                           |

## suppliers

Data dictionary for table suppliers. Specifies the fields associated with vendor and
supplier companies.

| Field Name    | Data Type | Length | Key | Null | Default        | Description                                      |
| ------------- | --------- | ------ | --- | ---- | -------------- | ------------------------------------------------ |
| id            | VARCHAR   | 32     | PK  | No   | Auto-generated | Unique identifier of the supplier.               |
| companyName   | VARCHAR   | 255    | UQ  | No   | —              | Registered company name.                         |
| contactPerson | VARCHAR   | 255    | —   | No   | —              | Name of the primary contact.                     |
| contactNumber | VARCHAR   | 13     | —   | No   | —              | 11-digit mobile or landline number.              |
| address       | VARCHAR   | 500    | —   | No   | —              | Supplier address.                                |
| archivedAt    | TIMESTAMP | —      | —   | Yes  | NULL           | Time the supplier was archived.                  |
| batchCount    | INT       | 11     | —   | Yes  | 0              | Denormalized total batch count for the supplier. |

## batches

Data dictionary for table batches. Specifies the fields associated with stock-in receipts
and their remaining stock.

| Field Name           | Data Type | Length | Key | Null | Default        | Description                                 |
| -------------------- | --------- | ------ | --- | ---- | -------------- | ------------------------------------------- |
| id                   | VARCHAR   | 32     | PK  | No   | Auto-generated | Unique identifier of the batch.             |
| productId            | VARCHAR   | 32     | FK  | No   | —              | References products.id.                     |
| supplierId           | VARCHAR   | 32     | FK  | No   | —              | References suppliers.id.                    |
| userId               | VARCHAR   | 32     | FK  | No   | —              | References users.id of the receiving owner. |
| batchCode            | VARCHAR   | 18     | UQ  | No   | —              | Unique batch reference code.                |
| totalProcurementCost | DECIMAL   | 12,2   | —   | No   | —              | Total amount paid for the receipt.          |
| unitCost             | DECIMAL   | 12,4   | —   | No   | —              | Cost per baseUom unit.                      |
| quantityReceived     | DECIMAL   | 12,3   | —   | No   | —              | Quantity received in baseUom.               |
| quantityRemaining    | DECIMAL   | 12,3   | —   | No   | —              | Undispatched stock left in the batch.       |
| status               | ENUM      | —      | —   | No   | active         | Batch status: active, depleted, or voided.  |
| createdAt            | TIMESTAMP | —      | —   | Yes  | NULL           | Record creation time.                       |

## dispatches

Data dictionary for table dispatches. Specifies the fields associated with stock-out
orders and their totals.

| Field Name        | Data Type | Length | Key | Null | Default        | Description                                 |
| ----------------- | --------- | ------ | --- | ---- | -------------- | ------------------------------------------- |
| id                | VARCHAR   | 32     | PK  | No   | Auto-generated | Unique identifier of the dispatch.          |
| userId            | VARCHAR   | 32     | FK  | No   | —              | References users.id of the submitting user. |
| customerReference | VARCHAR   | 50     | —   | Yes  | NULL           | Customer name or order reference.           |
| orNumber          | VARCHAR   | 16     | UQ  | Yes  | NULL           | Unique official-receipt number.             |
| userName          | VARCHAR   | 255    | —   | Yes  | NULL           | Cached name of the submitting user.         |
| itemCount         | INT       | 11     | —   | Yes  | NULL           | Number of batch deductions.                 |
| totalQuantity     | DECIMAL   | 12,3   | —   | Yes  | NULL           | Total dispatched quantity.                  |
| totalValue        | DECIMAL   | 12,2   | —   | Yes  | NULL           | Total cost of stock removed.                |
| productUnits      | JSON      | —      | —   | Yes  | NULL           | Units dispatched per product.               |
| createdAt         | TIMESTAMP | —      | —   | Yes  | NULL           | Record creation time.                       |

## dispatchItems

Data dictionary for table dispatchItems. Specifies the fields associated with the
individual line items of a dispatch.

| Field Name       | Data Type | Length | Key | Null | Default        | Description                                  |
| ---------------- | --------- | ------ | --- | ---- | -------------- | -------------------------------------------- |
| id               | VARCHAR   | 32     | PK  | No   | Auto-generated | Unique identifier of the dispatch line item. |
| dispatchId       | VARCHAR   | 32     | FK  | No   | —              | References dispatches.id.                    |
| batchId          | VARCHAR   | 32     | FK  | No   | —              | References batches.id.                       |
| productId        | VARCHAR   | 32     | FK  | No   | —              | References products.id.                      |
| dispatchUom      | ENUM      | —      | —   | No   | —              | Dispatch unit: piece, roll, or meter.        |
| dispatchQuantity | DECIMAL   | 12,3   | —   | No   | —              | Quantity in the chosen dispatch unit.        |
| quantityDeducted | DECIMAL   | 12,3   | —   | No   | —              | Quantity deducted in baseUom.                |
| unitCost         | DECIMAL   | 12,4   | —   | No   | —              | Unit cost at the time of dispatch.           |
| createdAt        | TIMESTAMP | —      | —   | Yes  | NULL           | Record creation time.                        |

## stockAdjustments

Data dictionary for table stockAdjustments. Specifies the fields associated with manual
inventory corrections.

| Field Name       | Data Type | Length | Key | Null | Default        | Description                                                    |
| ---------------- | --------- | ------ | --- | ---- | -------------- | -------------------------------------------------------------- |
| id               | VARCHAR   | 32     | PK  | No   | Auto-generated | Unique identifier of the stock adjustment.                     |
| batchId          | VARCHAR   | 32     | FK  | No   | —              | References batches.id.                                         |
| productId        | VARCHAR   | 32     | FK  | No   | —              | References products.id.                                        |
| userId           | VARCHAR   | 32     | FK  | No   | —              | References users.id of the recording owner.                    |
| quantityAdjusted | DECIMAL   | 12,3   | —   | No   | —              | Signed stock adjustment; positive adds, negative deducts.      |
| reason           | ENUM      | —      | —   | No   | —              | Adjustment reason: damaged, lost, recount, or system_reversal. |
| status           | ENUM      | —      | —   | No   | applied        | Adjustment status: applied or voided.                          |
| createdAt        | TIMESTAMP | —      | —   | Yes  | NULL           | Record creation time.                                          |

## auditLogs

Data dictionary for table auditLogs. Specifies the fields associated with the immutable
change history.

| Field Name   | Data Type | Length | Key | Null | Default        | Description                                                    |
| ------------ | --------- | ------ | --- | ---- | -------------- | -------------------------------------------------------------- |
| id           | VARCHAR   | 32     | PK  | No   | Auto-generated | Unique identifier of the log entry.                            |
| userId       | VARCHAR   | 32     | FK  | Yes  | NULL           | References users.id of the acting user.                        |
| action       | VARCHAR   | 19     | —   | No   | —              | Action code (e.g., product_create, stock_in, dispatch_submit). |
| description  | TEXT      | —      | —   | No   | —              | Human-readable or JSON-encoded action detail.                  |
| resourceType | VARCHAR   | 8      | —   | Yes  | NULL           | Affected record type (e.g., product, batch, dispatch).         |
| resourceId   | VARCHAR   | 32     | —   | Yes  | NULL           | Identifier of the affected record.                             |
| ipAddress    | VARCHAR   | 45     | —   | Yes  | NULL           | Client IP address.                                             |
| userAgent    | TEXT      | —      | —   | Yes  | NULL           | Client browser and device string.                              |
| createdAt    | TIMESTAMP | —      | —   | Yes  | NULL           | Time of the action.                                            |
