/**
 * Convex database schema for Sacks & Twines inventory management.
 *
 * Tables:
 * - `users` — Staff and owner accounts (extended from auth tables).
 * - `products` — Inventory items (sacks or twines) with SKU tracking.
 * - `suppliers` — Vendor/supplier companies.
 * - `batches` — Stock-in records linked to a product and supplier.
 * - `dispatches` — Stock-out orders (one dispatch = many items).
 * - `dispatchItems` — Line items within a dispatch.
 * - `stockAdjustments` — Manual inventory corrections.
 * - `auditLogs` — Immutable change history for compliance.
 */
import { authTables } from "@convex-dev/auth/server"
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  ...authTables,

  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    role: v.optional(v.union(v.literal("owner"), v.literal("staff"))),
    status: v.optional(v.union(v.literal("active"), v.literal("deactivated"))),
    emailVerificationTime: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_status", ["status"]),

  products: defineTable({
    skuCode: v.string(),
    name: v.string(),
    category: v.union(
      v.literal("sacks"),
      v.literal("twines"),
      v.literal("thread")
    ),
    baseUom: v.union(v.literal("piece"), v.literal("roll"), v.literal("meter")),
    conversionFactor: v.optional(v.number()),
    currentQuantity: v.number(),
    totalAssetValue: v.number(),
    lowStockThreshold: v.number(),
    status: v.union(v.literal("active"), v.literal("archived")),
    keywords: v.optional(v.array(v.string())),
    imagePath: v.optional(v.string()),
    batchCount: v.optional(v.number()),
    createdAt: v.optional(v.number()),
    // Denormalized from the most recent active batch. Written by
    // `batches.mutations.stockIn` and backfilled by `backfillProductLastSupplierId`.
    // Lets product list queries read it directly instead of scanning batches
    // per row. See docs/N-1-QUERY-AUDIT.md F1/F3.
    lastSupplierId: v.optional(v.id("suppliers")),
  })
    .index("by_sku", ["skuCode"])
    .index("by_name", ["name"])
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"]),

  suppliers: defineTable({
    companyName: v.string(),
    contactPerson: v.string(),
    contactNumber: v.string(),
    address: v.string(),
    archivedAt: v.optional(v.number()),
    batchCount: v.optional(v.number()),
  }).index("by_company", ["companyName"]),

  batches: defineTable({
    productId: v.id("products"),
    supplierId: v.id("suppliers"),
    userId: v.id("users"),
    batchCode: v.string(),
    totalProcurementCost: v.number(),
    unitCost: v.number(),
    quantityReceived: v.number(),
    quantityRemaining: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("depleted"),
      v.literal("voided")
    ),
    createdAt: v.optional(v.number()),
    // Denormalized display fields. Written by `batches.mutations.stockIn`, which
    // already holds the product, supplier and caller, and backfilled by
    // `backfillBatchDenorm`. They let the receiving-history list render without
    // a per-row join. Live documents remain the correctness path — reads must
    // fall back when these are missing. See docs/PERFORMANCE-AUDIT.md Phase 3.
    productName: v.optional(v.string()),
    productSku: v.optional(v.string()),
    supplierName: v.optional(v.string()),
    receivedBy: v.optional(v.string()),
  })
    .index("by_product", ["productId"])
    .index("by_product_status", ["productId", "status"])
    .index("by_batchCode", ["batchCode"])
    .index("by_supplier", ["supplierId"])
    .index("by_createdAt", ["createdAt"])
    .index("by_supplier_createdAt", ["supplierId", "createdAt"])
    // Receiving-history filters. Applied as index prefix equality rather than
    // in-memory so the page, `isDone` and `continueCursor` describe the filtered
    // set — filtering after pagination strands matches past the cursor.
    //
    // There is no `by_userId_createdAt` here. A receiver filter is impossible:
    // stock-in is owner-only (`batches.mutations.stockIn` → `requireOwner`) and
    // `users.mutations.create` hardcodes `role: "staff"`, so a second owner
    // cannot exist and every batch's `userId` is the one seeded owner.
    .index("by_status_createdAt", ["status", "createdAt"]),

  dispatches: defineTable({
    userId: v.id("users"),
    customerReference: v.optional(v.string()),
    orNumber: v.optional(v.string()),
    status: v.union(v.literal("completed"), v.literal("voided")),
    userName: v.optional(v.string()),
    itemCount: v.optional(v.number()),
    totalQuantity: v.optional(v.number()),
    totalValue: v.optional(v.number()),
    createdAt: v.optional(v.number()),
    // Per-product unit totals for this dispatch, aggregated at submit time.
    // Replaces the N+1 in `dashboard.queries.productMovement` (one
    // `dispatchItems.by_dispatch` read per dispatch). Bounded by the line count
    // of a single dispatch, which is operator-entered and small — but per
    // guidelines.md an array grows the document and rewrites it whole on every
    // patch, so if dispatch line counts are ever made unbounded this must move
    // to a parallel aggregate table keyed by dispatch.
    productUnits: v.optional(
      v.array(v.object({ productId: v.id("products"), units: v.number() }))
    ),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_createdAt", ["userId", "createdAt"])
    .index("by_createdAt", ["createdAt"])
    .index("by_status_createdAt", ["status", "createdAt"])
    .index("by_orNumber", ["orNumber"]),

  dispatchItems: defineTable({
    dispatchId: v.id("dispatches"),
    batchId: v.id("batches"),
    productId: v.id("products"),
    dispatchUom: v.union(
      v.literal("piece"),
      v.literal("roll"),
      v.literal("meter")
    ),
    dispatchQuantity: v.number(),
    quantityDeducted: v.number(),
    unitCost: v.number(),
    createdAt: v.optional(v.number()),
  })
    .index("by_dispatch", ["dispatchId"])
    .index("by_batch", ["batchId"])
    // Lets the reports exports read a date window of items in ONE index range
    // rather than one `by_dispatch` range per dispatch. See
    // docs/PERFORMANCE-AUDIT.md P9.
    .index("by_createdAt", ["createdAt"]),

  stockAdjustments: defineTable({
    batchId: v.id("batches"),
    productId: v.id("products"),
    userId: v.id("users"),
    quantityAdjusted: v.number(),
    reason: v.union(
      v.literal("damaged"),
      v.literal("lost"),
      v.literal("recount"),
      v.literal("system_reversal")
    ),
    status: v.union(v.literal("applied"), v.literal("voided")),
    createdAt: v.optional(v.number()),
  })
    .index("by_batch", ["batchId"])
    .index("by_userId", ["userId"])
    .index("by_createdAt", ["createdAt"]),

  auditLogs: defineTable({
    userId: v.optional(v.id("users")),
    action: v.string(),
    description: v.string(),
    resourceType: v.optional(v.string()),
    resourceId: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  })
    .index("by_action", ["action"])
    .index("by_userId", ["userId"])
    .index("by_action_userId", ["action", "userId"])
    .index("by_createdAt", ["createdAt"])
    .index("by_userId_createdAt", ["userId", "createdAt"]),
})
