import { authTables } from "@convex-dev/auth/server"
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  // Tables required for Convex Auth (Beta)
  ...authTables,

  // We extend the users table to include your specific roles
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.union(v.literal("owner"), v.literal("staff"))),
  }).index("by_email", ["email"]),

  products: defineTable({
    skuCode: v.string(), // Unique identifier for stock
    name: v.string(),
    category: v.union(v.literal("sacks"), v.literal("twines")),
    baseUom: v.union(v.literal("piece"), v.literal("roll")), // Unit of measure
    weightPerUnit: v.optional(v.number()),
    currentQuantity: v.number(),
    totalAssetValue: v.number(),
    lowStockThreshold: v.number(), // Point where alert triggers
    status: v.union(v.literal("active"), v.literal("archived")),
    imagePath: v.optional(v.string()),
  }).index("by_sku", ["skuCode"]),

  suppliers: defineTable({
    companyName: v.string(),
    contactPerson: v.optional(v.string()),
    contactNumber: v.optional(v.string()),
    address: v.optional(v.string()),
  }).index("by_company", ["companyName"]),

  batches: defineTable({
    productId: v.id("products"), // Reference to the products table
    supplierId: v.id("suppliers"), // Reference to the suppliers table
    userId: v.id("users"), // Who received this batch
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
  }).index("by_product", ["productId"]),

  dispatches: defineTable({
    userId: v.id("users"),
    customerReference: v.optional(v.string()),
    status: v.union(v.literal("completed"), v.literal("voided")),
  }),

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
  }).index("by_dispatch", ["dispatchId"]),

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
  }),

  auditLogs: defineTable({
    userId: v.optional(v.id("users")),
    action: v.string(),
    description: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  }),
})
