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
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  products: defineTable({
    skuCode: v.string(),
    name: v.string(),
    category: v.union(v.literal("sacks"), v.literal("twines")),
    baseUom: v.union(v.literal("piece"), v.literal("roll")),
    weightPerUnit: v.optional(v.number()),
    currentQuantity: v.number(),
    totalAssetValue: v.number(),
    lowStockThreshold: v.number(),
    status: v.union(v.literal("active"), v.literal("archived")),
    imagePath: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  })
    .index("by_sku", ["skuCode"])
    .index("by_name", ["name"])
    .index("by_status", ["status"]),

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
  })
    .index("by_product", ["productId"])
    .index("by_product_status", ["productId", "status"])
    .index("by_batchCode", ["batchCode"])
    .index("by_supplier", ["supplierId"]),

  dispatches: defineTable({
    userId: v.id("users"),
    customerReference: v.optional(v.string()),
    status: v.union(v.literal("completed"), v.literal("voided")),
    userName: v.optional(v.string()),
    itemCount: v.optional(v.number()),
    createdAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_createdAt", ["createdAt"]),

  dispatchItems: defineTable({
    dispatchId: v.id("dispatches"),
    batchId: v.id("batches"),
    productId: v.id("products"),
    dispatchUom: v.union(
      v.literal("piece"),
      v.literal("kilo"),
      v.literal("roll")
    ),
    dispatchQuantity: v.number(),
    quantityDeducted: v.number(),
    unitCost: v.number(),
    createdAt: v.optional(v.number()),
  })
    .index("by_dispatch", ["dispatchId"])
    .index("by_batch", ["batchId"]),

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
    .index("by_action_userId", ["action", "userId"]),
})
