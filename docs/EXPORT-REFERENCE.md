# Report Exports — Expected Output Reference

Reference for what the dispatch report export produces, so it can be verified
without literally downloading. Sources of truth:

- Export query: `convex/reports/queries.ts` (`exportDispatchReport`)
- Excel build (2 sheets): `lib/excel.ts` (`downloadDispatchExcel`)
- PDF build (compact grouped): `features/reports/components/export/report/dispatch-report.tsx`
- Dialog + range resolution: `features/reports/hooks/use-dispatch-export.ts`

> The per-entity CSV exports (products, batches, suppliers, dispatches, dispatch
> items, adjustments) and the composite monthly report were removed. Only the
> dispatch report export remains.

## Common behavior

- The export query is owner-gated (`caller.role !== "owner"` → `Unauthorized`).
- It takes an inclusive `startMs`/`endMs` window.
- It must be triggered with the dialog open; it is a one-shot `convex.query()`
  (not a subscription).
- Timestamp format (`en-PH`): `Aug 14, 2026, 6:12 PM`.
- File name: `dispatches-<yyyy-mm-dd>_to_<yyyy-mm-dd>.<xlsx|pdf>`.
- A capped read sets `truncated` and reports `limit`; both the Excel sheets and
  the PDF surface it rather than presenting a partial set as complete.

## Business time vs record time

- `createdAt` is business time ("when it happened"), defaulting to now and
  backdatable by owners up to 30 days past (see `BACKDATE_WINDOW_MS` in
  `convex/lib/constants.ts`). `_creationTime` stays the record time.
- Inventory math always applies at record time — backdating attributes the
  *event* to its business date for reports/history; it never replays a
  retroactive ledger.
- Consequence: re-running a past period after backdated entries were recorded
  can differ from a previously issued file. The generated-at stamp is what
  makes an issued file stand on its own.
- Receipts are the exception: OR numbers carry the *issue* date (record time),
  so backdated dispatches never sequence before already-issued receipts.
- Backdated creations are flagged in the audit trail: the log's `details`
  carry `transactionDate` and the summary carries a "(backdated to …)" suffix,
  while the log's own timestamp remains the record time.

## Dispatch Report — `exportDispatchReport`

Returns `{ dispatches, items, truncated, limit }` in ONE consistent snapshot so
the two Excel sheets (or the PDF groups) cannot straddle a write. Both collections
draw from the same `fetchDispatches` + `fetchItemsByDispatch` fast path.

### `dispatches` — one row per dispatch

| Field | Source |
| ----- | ------ |
| _id | `dispatch._id` |
| date | `dispatch.createdAt ?? dispatch._creationTime` → timestamp format |
| orNumber | `dispatch.orNumber ?? ""` |
| customerRef | `dispatch.customerReference ?? ""` |
| dispatchedBy | `dispatch.userName`, fallback `user.name` lookup |
| itemCount | `dispatch.itemCount`, fallback item-row count |
| totalQuantity | `dispatch.totalQuantity`, fallback `Σ dispatchQuantity` |
| totalValue | `dispatch.totalValue`, fallback `Σ quantityDeducted * unitCost` |

### `items` — one row per dispatch line item

| Field | Source |
| ----- | ------ |
| dispatchId | parent dispatch `_id` |
| date | parent `dispatch.createdAt ?? _creationTime` → timestamp format |
| orNumber | `dispatch.orNumber ?? ""` |
| customerRef | `dispatch.customerReference ?? ""` |
| dispatchedBy | `dispatch.userName`, fallback lookup |
| product | `product.name` (`""` if missing) |
| batchCode | `batch.batchCode` (`""` if missing) |
| dispatchUom | `item.dispatchUom` |
| dispatchQty | `item.dispatchQuantity` |
| qtyDeducted | `item.quantityDeducted` |
| unitCost | `item.unitCost` |
| lineTotal | `item.quantityDeducted * item.unitCost` |

Example lines (dev data — dispatch `OR-20260814-7275`, verified item-level):

| Date | Customer Reference | Dispatched By | OR Number | Product | Batch Code | Dispatch UoM | Dispatch Qty | Qty Deducted | Unit Cost | Line Total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Aug 14, 2026, 9:20 AM |  | Michael | OR-20260814-7275 | Red bag | BAT-20250501-0038 | piece | 7 | 7 | 59.68 | 417.76 |
| Aug 14, 2026, 9:20 AM |  | Michael | OR-20260814-7275 | Sewing Thread Small | BAT-20250501-0068 | roll | 3 | 3 | 187.36 | 562.08 |
| Aug 14, 2026, 9:20 AM |  | Michael | OR-20260814-7275 | Sewing Twine | BAT-20250501-0046 | meter | 26.36 | 26.36 | 157.1 | 4141.156 |

> Line total sum (`5120.996`) exactly matches this dispatch's denormalized `totalValue`.

> Expect many more rows than dispatch count (10+ item rows per dispatch).

## Verification notes

- The export query requires an authenticated owner session, so it can't be
  invoked from the CLI (`convex run` → `Unauthorized`). Verify against the field
  specs above plus `pnpm convex data <table> --limit 5 --format json` for real
  values.
- Denormalized `totalQuantity`/`totalValue`/`itemCount` on dispatches are
  backfilled on dev (migrations ran), so the fallback recomputation branches are
  cold paths.
