# Business Rules — Sacks & Twines

> ⚠️ Some rules below may not reflect the current implementation — marked as unfinished where known.

**Legend:** ✅ Implemented · 🟡 Partial · ❌ Pending · ⚠️ Needs Review

---

## 1. Auth & Access Control

### 1.1 Credential Verification

**Status:** ✅ Implemented (`convex/auth.ts`)

- Lookup is by email only. Password verification uses `password_verify()` equivalent (Convex auth handles this).
- Both "user not found" and "wrong password" return the same generic error — no distinction is leaked.

### 1.2 Role-Based Access

**Status:** ✅ Implemented (`convex/proxy.ts`, route groups)

| Route                  | Roles        | Notes                   |
| ---------------------- | ------------ | ----------------------- |
| `/dashboard`           | owner        |                         |
| `/inventory`           | owner        |                         |
| `/products`            | owner, staff |                         |
| `/reports`             | owner        |                         |
| `/suppliers`           | owner        |                         |
| `/users`               | owner        |                         |
| `/dispatch-history`    | owner, staff |                         |
| `/audit-logs`          | owner        | Full audit trail        |
| `/audit-logs/personal` | staff        | Staff see own logs only |
| `/sign-in`             | guest        | Signed-out users only   |
| `/sign-out`            | owner, staff | Signed-in users only    |

### 1.3 Navigation / Sidebar Rules

**Status:** ✅ Implemented (`app-sidebar.tsx`)

- Staff role does NOT see the sidebar — they get a slim header nav instead.
- Navigation groups: Overview, Operations, Insights, Management.
- Only routes tagged with `nav.show: true` appear.

---

## 2. Products

### 2.1 SKU Generation

**Status:** ✅ Implemented (`convex/products/mutations.ts`)

- Format: `SKU-YYYYMMDD-XXXX` where XXXX is a random int 1000-9999.
- Up to 20 retry attempts for uniqueness.
- Fails with error if 20 attempts exhausted.

### 2.2 Product Uniqueness

**Status:** ✅ Implemented (`convex/products/mutations.ts`)

- Product name uniqueness is case-insensitive.
- SKU code uniqueness is exact-match.

### 2.3 Product Status & Lifecycle

**Status:** ✅ Implemented (schema)

- Status values: `"active"` | `"archived"`.
- Stock-out page only shows products where `status = "active"`.
- Cannot stock into an archived product.
- All products returned ordered by `name ASC`.

### 2.4 Product Image Upload

**Status:** ✅ Implemented (Convex file storage)

| Rule               | Value                                 |
| ------------------ | ------------------------------------- |
| Max file size      | 5 MB                                  |
| Allowed MIME types | `image/jpeg`, `image/png`, `image/webp` |
| Validation         | Client-side via `useUploadFile` hook   |
| Storage            | Convex file storage (`ctx.storage.store()`) |
| URL                | `ctx.storage.getUrl(storageId)` — ephemeral, auto-refreshed by Convex |

---

## 3. Batches & Stock-In

### 3.1 Batch Code Generation

**Status:** ✅ Implemented (`convex/batches/mutations.ts`)

- Format: `BAT-YYYYMMDD-XXXX` where XXXX is random int 1000-9999.
- Up to 20 retry attempts for uniqueness.

### 3.2 Unit Cost Calculation

**Status:** ✅ Implemented (`convex/batches/mutations.ts`)

```
unitCost = totalProcurementCost / quantityReceived
```

- If `quantityReceived <= 0`, unit cost = 0.
- `quantityRemaining` is initialized to equal `quantityReceived`.

### 3.3 Stock-In Effect on Product

**Status:** ✅ Implemented (`convex/batches/mutations.ts`)

```
product.currentQuantity += quantityReceived
product.totalAssetValue += totalProcurementCost
```

### 3.4 Batch Update — Validation

**Status:** ✅ Implemented (`convex/batches/validators.ts`, `convex/batches/mutations.ts`)

| Field                | Rule                                         |
| -------------------- | -------------------------------------------- |
| supplierId           | Required, must exist                         |
| quantityReceived     | Must be > 0                                  |
| totalProcurementCost | Must be > 0                                  |
| category             | If provided, must be `"sacks"` or `"twines"` |
| baseUom              | If provided, must be `"piece"` or `"roll"`   |
| weightPerUnit        | If provided, must be >= 0                    |
| lowStockThreshold    | If provided, must be >= 0                    |

### 3.5 Batch Update — History Lock

**Status:** ✅ Implemented (`convex/batches/mutations.ts`)

- If the batch has dispatch items OR active adjustments (`hasHistory` is true):
  - `quantityReceived` and `totalProcurementCost` are locked — cannot be changed.
  - Only `supplierId` and product catalog fields (category, baseUom, etc.) can be updated.
- If no history, inventory fields are mutable. On change:
  - `quantityDelta = newQuantityReceived - oldQuantityReceived`
  - `costDelta = newTotalCost - oldTotalCost`
  - Product's `currentQuantity` and `totalAssetValue` are adjusted by the deltas.
  - `newUnitCost = newTotalCost / newQuantityReceived`

### 3.6 Batch Void

**Status:** ✅ Implemented (`convex/batches/mutations.ts`)

**Validations:**
- Batch must exist.
- Only batches with `status = "active"` can be voided.
- Void reason, if provided, max 500 chars.
- **BLOCKED** if batch has any dispatch items — `Cannot void a batch that has been used in dispatches`.

**Cascade effects (transactional):**
1. Set batch `status = "voided"`.
2. Decrement product: `currentQuantity -= batch.quantityRemaining` (clamped to 0).
3. Decrement product: `totalAssetValue -= batch.totalProcurementCost` (clamped to 0).
4. Void all applied stock adjustments for this batch (best-effort).

---

## 4. Dispatch / Stock-Out ✅ Implemented

> Implemented in `convex/dispatches/`, `features/dispatches/`, `app/(dashboard)/products/page.tsx`. 11 tests.

### 4.1 Twine Kilo-to-Roll Conversion

**Status:** ✅ Implemented (`convex/dispatches/mutations.ts`)

- Only applies when `product.category === "twines"` AND `dispatchUom === "kilo"`.
- Formula: `dispatchQuantity = dispatchQuantity / 20`
- Change `dispatchUom` to `"roll"` for the dispatch item record.
- The stock availability check also uses the converted quantity.
- **Hardcoded conversion:** 1 roll = 20 kg.

### 4.2 Dispatch Validation

**Status:** ✅ Implemented (`convex/dispatches/validators.ts`, Zod schema)

| Rule                     | Detail                                                                      |
| ------------------------ | --------------------------------------------------------------------------- |
| Items array              | Must be non-empty                                                           |
| Per item: `productId`    | Must be > 0, product must exist                                             |
| Per item: `quantity`     | Must be > 0                                                                 |
| Per item: `dispatchUom`  | Must be `"piece"` \| `"kilo"` \| `"roll"`. Defaults to `"piece"` if invalid |
| Stock check              | `product.currentQuantity >= checkQuantity`                                  |
| Insufficient stock error | `"Insufficient stock for {name}. Available: {currentStock}"`                |
| No batches error         | If `deductFromBatches()` returns 0 batches used                             |
| Zero items dispatched    | Roll back with `"No valid items to dispatch"`                               |

### 4.3 FIFO Deduction Algorithm

**Status:** ✅ Implemented (`convex/dispatches/mutations.ts`)

```
remainingToDeduct = dispatchQuantity

batches = query batches WHERE
    productId = :productId
    AND status = "active"
    AND quantityRemaining > 0
    ORDER BY _creationTime ASC   // oldest first

for each batch in batches:
    if remainingToDeduct <= 0: break

    toDeduct = min(batch.quantityRemaining, remainingToDeduct)

    // Optimistic lock pattern:
    UPDATE batches SET quantityRemaining -= toDeduct
    WHERE _id = batch._id AND quantityRemaining >= toDeduct
    // If rowCount === 0, skip (race condition — another process consumed it)

    INSERT dispatchItem:
        dispatchQuantity = toDeduct
        quantityDeducted = toDeduct
        unitCost = batch.unitCost
        dispatchUom = (converted if applicable)

    remainingToDeduct -= toDeduct
    batchesUsed += 1

if batchesUsed > 0:
    decrement product.currentQuantity by original dispatchQuantity

if batch.quantityRemaining === 0:
    set batch.status = "depleted"
```

### 4.4 Customer Reference

**Status:** ✅ Implemented (`convex/dispatches/validators.ts`)

- Optional text field.
- Purpose: customer name or plate number.
- If empty after trim, store as `null`.

### 4.5 Dispatch Audit Log

**Status:** ✅ Implemented (`convex/dispatches/mutations.ts`)

- Action: `"stock_out"`.
- Description includes dispatched items summary.

---

## 5. Dispatch History ❌ Pending

### 5.1 List Dispatches Query

**Status:** ❌ Pending

- Returns dispatches with computed fields: `createdAt`, `customerReference`, `staffName` (from users join), `totalItems` (subquery count of dispatch items), `status`.
- Default filter: today only (`_creationTime >= startOfToday`).
- Accept optional date range parameter.
- Ordered by `createdAt DESC`.

### 5.2 Dispatch Items Query

**Status:** ❌ Pending

- Accepts `dispatchId`.
- Returns items joined with `productId` → `product.name` and `batchId` → `batch.batchCode`.
- Ordered by `_creationTime ASC`.

### 5.3 Dispatch History Chart Data

**Status:** ❌ Pending

Used by dashboard bar chart. Accepts range parameter:

| Range       | Grouping          | Interval               |
| ----------- | ----------------- | ---------------------- |
| `"today"`   | By hour (`%h %p`) | Current day only       |
| `"week"`    | By weekday (`%a`) | Last 7 days            |
| `"month"`   | By date (`%b %d`) | Last 1 month (default) |
| `"3months"` | By date (`%b %d`) | Last 3 months          |
| `"year"`    | By month (`%b`)   | Last 1 year            |

Only completed dispatches included. Returns `[{date, totalQuantity}]`.

---

## 6. Dashboard ❌ Pending

### 6.1 Total Asset Value

**Status:** ❌ Pending

```
SUM(batches.quantityRemaining * batches.unitCost)
WHERE batches.status = "active"
```

### 6.2 Total Dispatch Value (All-Time)

**Status:** ❌ Pending

```
SUM(dispatchItems.quantityDeducted * dispatchItems.unitCost)
WHERE dispatch.status = "completed"
```

### 6.3 Today's Stock Adjustment Count

**Status:** ❌ Pending

```
COUNT(*) FROM stockAdjustments
WHERE _creationTime >= startOfToday AND _creationTime < startOfTomorrow
```

### 6.4 Efficiency Rate

**Status:** ❌ Pending

```
received = SUM(batches.quantityReceived) WHERE batches.status = "active"
dispatched = SUM(dispatchItems.quantityDeducted)
            JOIN dispatches WHERE status = "completed"
efficiency = min(100, round(dispatched / received * 100))
```

### 6.5 Low-Stock Products

**Status:** ❌ Pending

- Query products where `status = "active"`.
- For each product: `currentQty = SUM(batches.quantityRemaining WHERE status = "active")`.
- Include only where `currentQty <= product.lowStockThreshold`.
- Order by `currentQty ASC, name ASC`.

### 6.6 Top Products (Last 30 Days)

**Status:** ❌ Pending

- Only completed dispatches in the last 30 days.
- `SUM(dispatchItems.quantityDeducted)` per product.
- Top 3 products only, ordered by `totalQty DESC`.

### 6.7 Today's Dispatch Count & Value

**Status:** ❌ Pending

- Filter: `dispatch.status = "completed"` AND `_creationTime` is today.
- Count: `COUNT(DISTINCT dispatch._id)`.
- Value: `SUM(dispatchItems.quantityDeducted * dispatchItems.unitCost)`.

---

## 7. Stock Adjustments

### 7.1 Adjustment Reasons

**Status:** 🟡 Schema defined, UI pending

| Reason            | Meaning                             |
| ----------------- | ----------------------------------- |
| `damaged`         | Products damaged in storage         |
| `lost`            | Products lost/missing               |
| `recount`         | Inventory recount correction        |
| `system_reversal` | Reversal of a previous system error |

### 7.2 Create Adjustment

**Status:** ❌ Pending

- Validates: batch exists, product exists, quantity > 0, reason is valid.
- Effect on product:
  - `currentQuantity += quantityAdjusted` (positive = addition, negative = deduction)
  - `totalAssetValue += (quantityAdjusted * batch.unitCost)`
- Audit log: `"stock_adjustment"`.

### 7.3 Void Adjustment

**Status:** 🟡 Auto-void on batch void implemented, standalone void pending

- Reverse the adjustment effect on product quantities/values.
- Set `status = "voided"`.
- Audit log: `"stock_adjustment_void"`.

### 7.4 Auto-Void on Batch Void

**Status:** ✅ Implemented (`convex/batches/mutations.ts`)

- When a batch is voided, all applied stock adjustments for that batch are voided automatically.
- This is best-effort (errors are caught and logged, not thrown).

---

## 8. Audit Logging

### 8.1 All Actions Logged

**Status:** ✅ Implemented (`convex/auditLogs`)

Every mutation records an audit entry with:
- `userId` (who performed the action)
- `action` (stable action name, e.g., `"stock_in"`, `"batch_void"`, `"user_create"`)
- `description` (JSON string with context)
- `ipAddress` (optional, from `userAgent` / request metadata)
- `userAgent` (optional, passed by frontend)

### 8.2 Audit Log Actions Inventory

| Action               | Implemented                            |
| -------------------- | -------------------------------------- |
| `stock_in`           | ✅                                      |
| `stock_out`          | ✅ Implemented                          |
| `batch_update`       | ✅                                      |
| `batch_void`         | ✅                                      |
| `supplier_create`    | ✅                                      |
| `supplier_update`    | ✅                                      |
| `supplier_delete`    | ❌ Pending (delete not yet implemented) |
| `supplier_archive`   | ✅                                      |
| `supplier_unarchive` | ✅                                      |
| `user_create`        | ✅                                      |
| `user_deactivate`    | ✅                                      |
| `stock_adjustment`   | ❌ Pending                              |

### 8.3 Audit Log Queries

**Status:** ✅ Implemented (`convex/audit-logs/queries.ts` is pending, but filtering logic is documented)

**Filtering rules (server-side paginated):**
- Search across `description`, `userName`, `userEmail`.
- Filter by `action` (distinct action list provided separately for dropdown).
- Filter by `userId` (list of users with logs provided for dropdown).
- Date range: `dateFrom` and `dateTo`.
- Sortable by: `createdAt`, `action`, `userName`.
- Default sort: `createdAt DESC`.
- Pagination: default page 1, limit 20.

### 8.4 CSV Export

**Status:** ❌ Pending

- Respects all active filters (search, action, user, date range).
- Columns: Timestamp, User, Email, Role, Action, Resource Type, Resource ID, Description, IP Address.
- Max 10,000 rows in export.
- BOM for UTF-8 encoding.

---

## 9. Suppliers

### 9.1 PH Contact Number Validation

**Status:** ✅ Implemented (`convex/validators/helpers.ts`)

After removing non-digit characters, must match one of:

- **Mobile:** `/^(09|639)\d{9}$/` — e.g., `09171234567` or `639171234567`.
- **Landline:** `/^(0\d{2}|63\d{2})\d{7}$/`.

### 9.2 Supplier Uniqueness

**Status:** ✅ Implemented (`convex/suppliers/mutations.ts`)

- Company name uniqueness is case-insensitive.
- On update, excludes the current supplier from the duplicate check.

### 9.3 Supplier Archive

**Status:** ✅ Implemented (`convex/suppliers/mutations.ts`)

- **BLOCKED** if supplier has existing batch records.
- Message: `"This supplier has existing batch records and cannot be archived."`
- Sets `archivedAt = Date.now()`.

### 9.4 Supplier Unarchive

**Status:** ✅ Implemented (`convex/suppliers/mutations.ts`)

- Clears `archivedAt` (sets to `undefined`).
- No batch check needed — any supplier can be unarchived.

### 9.5 Supplier Delete

**Status:** ❌ Pending

- **BLOCKED** if supplier has associated batches.
- Error message lists related batches: batch code, product name, quantity.
- If no batches exist, hard-delete the supplier record.
- Audit log: `"supplier_delete"`.

---

## 10. Users

### 10.1 Staff-Only Creation

**Status:** ✅ Implemented (`convex/users/mutations.ts`)

- Role is hardcoded to `"staff"` — all created users are staff.
- Name: required, 2-255 chars.
- Email: required, valid format, unique (case-insensitive).
- Password: required, minimum 8 chars.

### 10.2 User Deactivation

**Status:** ✅ Implemented (`convex/users/mutations.ts`)

- Target must have `role = "staff"` — cannot deactivate owner.
- Cannot deactivate your own account.
- Sets `status = "deactivated"` (soft delete).
- Audit log: `"user_deactivate"`.

### 10.3 User Reactivation

**Status:** ❌ Pending

- Sets `status = "active"`.
- No additional checks needed — any deactivated user can be restored.

---

## 11. All Formulas Reference

| Formula                                                     | Context                     | Status |
| ----------------------------------------------------------- | --------------------------- | ------ |
| `unitCost = totalProcurementCost / quantityReceived`        | Batch creation, update      | ✅      |
| `quantityDelta = newQtyReceived - oldQtyReceived`           | Batch update inventory sync | ✅      |
| `costDelta = newTotalCost - oldTotalCost`                   | Batch update inventory sync | ✅      |
| `newQty = currentQty + qtyDelta` (clamped to 0)             | adjustProductInventory      | ✅      |
| `newAsset = totalAssetValue + costDelta` (clamped to 0)     | adjustProductInventory      | ✅      |
| `checkQty = qty / 20` (twines kilo → roll)                  | Dispatch validation         | ✅      |
| `toDeduct = min(batchRemaining, remainingToDeduct)`         | FIFO deduction              | ✅      |
| `remainingToDeduct -= toDeduct`                             | FIFO iteration              | ✅      |
| `assetValue = SUM(remaining * unitCost)`                    | Dashboard                   | ❌      |
| `dispatchValue = SUM(deducted * unitCost)`                  | Dashboard                   | ❌      |
| `efficiency = min(100, round(dispatched / received * 100))` | Dashboard                   | ❌      |
| `currentQty = SUM(batch.remaining) HAVING <= threshold`     | Low-stock detection         | ❌      |
| SKU: `SKU-YYYYMMDD-XXXX`                                    | Product creation            | ✅      |
| Batch: `BAT-YYYYMMDD-XXXX`                                  | Batch creation              | ✅      |

---

## 12. Caching Rules

| Endpoint            | Cache Header | Status               |
| ------------------- | ------------ | -------------------- |
| Product list        | 5 min        | n/a (Convex handles) |
| Supplier list       | 5 min        | n/a (Convex handles) |
| Batch listing       | 5 min        | n/a (Convex handles) |
| Batch detail        | No cache     | n/a (Convex handles) |
| Dispatch endpoints  | No cache     | n/a (Convex handles) |
| Dashboard endpoints | No cache     | n/a (Convex handles) |
