import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import { internalMutation } from "./_generated/server"

// ─── Helpers ───────────────────────────────────────────────────────────────

function rnd<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function rndInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  )
}

function toFloat(n: number, decimals = 2): number {
  return parseFloat(n.toFixed(decimals))
}

const DATE_BASE = new Date("2025-05-01T00:00:00+08:00")
const DATE_END = new Date("2026-05-10T00:00:00+08:00")

let skuCounter = 0
function nextSkuCode(): string {
  skuCounter++
  const ds = "20250501"
  const suffix = String(skuCounter).padStart(4, "0")
  return `SKU-${ds}-${suffix}`
}

let batchCounter = 0
function nextBatchCode(): string {
  batchCounter++
  const ds = "20250501"
  const suffix = String(batchCounter).padStart(4, "0")
  return `BAT-${ds}-${suffix}`
}

// ─── Supplier definitions ──────────────────────────────────────────────────

const SUPPLIER_DEFS = [
  {
    companyName: "Mabuhay Fiber Supply",
    contactPerson: "Roberto Santos",
    contactNumber: "0917-123-4561",
    address: "Davao City, Davao del Sur",
  },
  {
    companyName: "Golden Harvest Co.",
    contactPerson: "Lita Reyes",
    contactNumber: "0918-234-5672",
    address: "Cebu City, Cebu",
  },
  {
    companyName: "Baguio Twine Traders",
    contactPerson: "Miguel Ong",
    contactNumber: "0919-345-6783",
    address: "Baguio City, Benguet",
  },
  {
    companyName: "Luzon Sacks Inc.",
    contactPerson: "Ana Cruz",
    contactNumber: "0920-456-7894",
    address: "San Fernando, Pampanga",
  },
  {
    companyName: "Island Weave Corp.",
    contactPerson: "Carlos Lim",
    contactNumber: "0921-567-8905",
    address: "Iloilo City, Iloilo",
  },
  {
    companyName: "Palawan Raw Materials",
    contactPerson: "Elena Dimaano",
    contactNumber: "0922-678-9016",
    address: "Puerto Princesa, Palawan",
  },
]

// ─── Product definitions ───────────────────────────────────────────────────

interface ProductDef {
  name: string
  category: "sacks" | "twines"
  baseUom: "piece" | "roll"
  weightPerUnit: number
  lowStockThreshold: number
}

const PRODUCT_DEFS: ProductDef[] = [
  {
    name: "Rice Sack",
    category: "sacks",
    baseUom: "piece",
    weightPerUnit: 0,
    lowStockThreshold: 100,
  },
  {
    name: "Gunny Sack",
    category: "sacks",
    baseUom: "piece",
    weightPerUnit: 0,
    lowStockThreshold: 100,
  },
  {
    name: "Flour Sack",
    category: "sacks",
    baseUom: "piece",
    weightPerUnit: 0,
    lowStockThreshold: 100,
  },
  {
    name: "Binder Twine",
    category: "twines",
    baseUom: "roll",
    weightPerUnit: 20,
    lowStockThreshold: 50,
  },
  {
    name: "Baler Twine",
    category: "twines",
    baseUom: "roll",
    weightPerUnit: 20,
    lowStockThreshold: 50,
  },
  {
    name: "Sisal Twine",
    category: "twines",
    baseUom: "roll",
    weightPerUnit: 20,
    lowStockThreshold: 50,
  },
]

const PRODUCT_IMAGE_MAP: Record<string, string> = {
  "Rice Sack": "kg274bbqe3y204k3t9rb9pkbv58773qm",
  "Gunny Sack": "kg26bxcwgxghe3kgnfrngreh89876fjg",
  "Flour Sack": "kg24nnbp9tc1gfb0n0krd9hw958764sw",
  "Binder Twine": "kg28hxx2hbbcxyek93y5sxj9658773qy",
  "Baler Twine": "kg2bxmmkvnrdp6fyzcg05ejdcn876kgt",
  "Sisal Twine": "kg27da983b0880hwwvhn2khqqh8778en",
}

// ─── Internal Mutation: writeAll ───────────────────────────────────────────

/**
 * Writes sample suppliers, products, batches, dispatches, stock adjustments,
 * and audit logs with historical `createdAt` timestamps.
 * Clears existing data before seeding.
 * Internal mutation — called by `seedAll` action.
 */
export const writeAll = internalMutation({
  args: {
    ownerId: v.id("users"),
    staffId: v.id("users"),
  },
  handler: async (ctx, { ownerId, staffId }) => {
    // ═══════════════════════════════════════════════════════════════════════
    // 1. Insert suppliers
    // ═══════════════════════════════════════════════════════════════════════
    // ═══════════════════════════════════════════════════════════════════════
    // 2. Insert products
    // ═══════════════════════════════════════════════════════════════════════
    const [supplierIds, productResults] = await Promise.all([
      Promise.all(SUPPLIER_DEFS.map((def) => ctx.db.insert("suppliers", def))),
      Promise.all(
        PRODUCT_DEFS.map(async (def) => {
          const productCreatedAt = randDate(DATE_BASE, DATE_END)
          const id = await ctx.db.insert("products", {
            skuCode: nextSkuCode(),
            name: def.name,
            category: def.category,
            baseUom: def.baseUom,
            weightPerUnit: def.weightPerUnit,
            currentQuantity: 0,
            totalAssetValue: 0,
            lowStockThreshold: def.lowStockThreshold,
            status: "active",
            imagePath: PRODUCT_IMAGE_MAP[def.name],
            createdAt: productCreatedAt.getTime(),
          })
          return { id, def }
        })
      ),
    ])
    const productMap: Record<string, { id: Id<"products">; def: ProductDef }> =
      {}
    for (const { id, def } of productResults) {
      productMap[def.name] = { id, def }
    }

    const productList = Object.values(productMap)

    // ═══════════════════════════════════════════════════════════════════════
    // 4. Insert batches (1-5 per product)
    // ═══════════════════════════════════════════════════════════════════════
    const userIds = [ownerId, staffId]
    const batchRecords: Array<{
      id: Id<"batches">
      productId: Id<"products">
      unitCost: number
      quantityRemaining: number
      baseUom: string
      batchCode: string
      createdDate: Date
      status: "active" | "depleted"
    }> = []

    for (const { id: pId, def } of productList) {
      const numBatches = rndInt(5, 12)
      let lastDate = DATE_BASE

      for (let i = 0; i < numBatches; i++) {
        const span = DATE_END.getTime() - lastDate.getTime()
        const batchDate = new Date(
          lastDate.getTime() + Math.random() * span * 0.7
        )
        if (batchDate > DATE_END) continue

        const supplierId = rnd(supplierIds)
        const userId = rnd(userIds)
        const unitCost =
          def.baseUom === "piece"
            ? toFloat(rndInt(45, 95) + Math.random())
            : toFloat(rndInt(120, 280) + Math.random())

        const qty =
          def.baseUom === "piece"
            ? rndInt(2000, 8000)
            : toFloat(rndInt(5000, 15000) + Math.random())

        const batchCode = nextBatchCode()
        const batchId = await ctx.db.insert("batches", {
          productId: pId,
          supplierId,
          userId,
          batchCode,
          totalProcurementCost: toFloat(unitCost * qty),
          unitCost,
          quantityReceived: qty,
          quantityRemaining: qty,
          status: "active",
          createdAt: batchDate.getTime(),
        })

        batchRecords.push({
          id: batchId,
          productId: pId,
          unitCost,
          quantityRemaining: qty,
          baseUom: def.baseUom,
          batchCode,
          createdDate: batchDate,
          status: "active",
        })

        lastDate = batchDate
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 5. Insert dispatches + items (~100 dispatches, peak-weighted)
    // ═══════════════════════════════════════════════════════════════════════
    const NUM_DISPATCHES = 1000
    const dispatchRecords: Array<{
      id: Id<"dispatches">
      userId: Id<"users">
      createdDate: Date
    }> = []
    const dispatchItemsToInsert: Array<{
      dispatchId: Id<"dispatches">
      batchId: Id<"batches">
      productId: Id<"products">
      dispatchUom: "piece" | "kilo" | "roll"
      dispatchQuantity: number
      quantityDeducted: number
      unitCost: number
      createdAt: number
    }> = []

    const peakStart = new Date("2025-10-01T00:00:00+08:00")
    const peakEnd = DATE_END

    // Build product → active batches index for O(1) lookups
    const activeBatchesByProduct = new Map<
      Id<"products">,
      typeof batchRecords
    >()
    const depletedBatchIds = new Set<Id<"batches">>()
    for (const batch of batchRecords) {
      let list = activeBatchesByProduct.get(batch.productId)
      if (!list) {
        list = []
        activeBatchesByProduct.set(batch.productId, list)
      }
      list.push(batch)
    }

    for (let i = 0; i < NUM_DISPATCHES; i++) {
      const isPeak = Math.random() < 0.85
      const dBase = isPeak
        ? randDate(peakStart, peakEnd)
        : randDate(DATE_BASE, peakStart)

      const userId = rnd(userIds)
      const refs: Array<string | null> = [
        null,
        null,
        null,
        `PO-2025-${rndInt(1000, 9999)}`,
        `SO-${rndInt(100, 999)}`,
        `DR-${rndInt(1000, 9999)}`,
      ]
      const customerReference = rnd(refs)

      const isVoided = Math.random() < 0.05
      const dispatchId = await ctx.db.insert("dispatches", {
        userId,
        customerReference: customerReference ?? undefined,
        status: isVoided ? "voided" : "completed",
        createdAt: dBase.getTime(),
      })

      dispatchRecords.push({ id: dispatchId, userId, createdDate: dBase })

      const productBatches = activeBatchesByProduct

      // 1-5 items per dispatch
      const numItems = rndInt(1, 5)
      const usedProducts = new Set<Id<"products">>()

      for (let j = 0; j < numItems; j++) {
        const available = productList.filter((p) => !usedProducts.has(p.id))
        if (available.length === 0) break

        const product = rnd(available)
        usedProducts.add(product.id)

        const dispatchQty =
          product.def.baseUom === "piece"
            ? rndInt(5, 50)
            : toFloat(rndInt(2, 30) + Math.random())

        const qtyDeducted = toFloat(
          product.def.baseUom === "piece"
            ? dispatchQty
            : dispatchQty * product.def.weightPerUnit,
          4
        )

        // Find an active batch with enough remaining
        const productBatchesList = (
          productBatches.get(product.id) ?? []
        ).filter((b) => !depletedBatchIds.has(b.id))
        const candidateBatches = productBatchesList.filter(
          (b) => b.quantityRemaining >= qtyDeducted
        )

        if (candidateBatches.length === 0) {
          let anyBatch: (typeof productBatchesList)[number] | undefined
          for (const batch of productBatchesList) {
            if (batch.quantityRemaining > 0) {
              anyBatch = batch
              break
            }
          }
          if (!anyBatch || anyBatch.quantityRemaining < qtyDeducted) continue
          candidateBatches.push(anyBatch)
        }

        const batch = candidateBatches.reduce((a, b) =>
          a.quantityRemaining > b.quantityRemaining ? a : b
        )

        const dispatchUom =
          product.def.baseUom === "piece"
            ? ("piece" as const)
            : ("kilo" as const)

        dispatchItemsToInsert.push({
          dispatchId,
          batchId: batch.id,
          productId: product.id,
          dispatchUom,
          dispatchQuantity: dispatchQty,
          quantityDeducted: qtyDeducted,
          unitCost: batch.unitCost,
          createdAt: dBase.getTime(),
        })

        // Deduct from batch
        batch.quantityRemaining = toFloat(
          batch.quantityRemaining - qtyDeducted,
          4
        )

        // Track depleted batches for O(1) exclusion
        if (batch.quantityRemaining <= 0) {
          depletedBatchIds.add(batch.id)
        }
      }
    }

    // ── Post-process dispatches ──
    const itemCountMap = new Map<string, number>()
    for (const item of dispatchItemsToInsert) {
      itemCountMap.set(
        item.dispatchId,
        (itemCountMap.get(item.dispatchId) ?? 0) + 1
      )
    }

    const nonEmptyDispatches: typeof dispatchRecords = []
    const emptyDispatchIds: Array<Id<"dispatches">> = []
    for (const d of dispatchRecords) {
      const count = itemCountMap.get(d.id) ?? 0
      if (count === 0) {
        emptyDispatchIds.push(d.id)
      } else {
        nonEmptyDispatches.push(d)
      }
    }

    dispatchRecords.length = 0
    dispatchRecords.push(...nonEmptyDispatches)

    const [ownerUser, staffUser] = await Promise.all([
      ctx.db.get(ownerId),
      ctx.db.get(staffId),
    ])
    const userNameMap: Record<string, string> = {
      [ownerId]: ownerUser?.name ?? "Owner",
      [staffId]: staffUser?.name ?? "Staff",
    }

    await Promise.all([
      ...emptyDispatchIds.map((id) => ctx.db.delete(id)),
      ...nonEmptyDispatches.map((d) =>
        ctx.db.patch(d.id, {
          itemCount: itemCountMap.get(d.id),
          userName: userNameMap[d.userId],
        })
      ),
    ])

    // Insert dispatch items
    await Promise.all(
      dispatchItemsToInsert.map((item) => ctx.db.insert("dispatchItems", item))
    )

    // ── Update batch quantities after dispatches ──
    for (const batch of batchRecords) {
      const remaining = Math.max(0, batch.quantityRemaining)
      if (remaining <= 0) {
        batch.status = "depleted"
      }
      batch.quantityRemaining = remaining
    }
    await Promise.all(
      batchRecords.map((batch) => {
        const patch: Record<string, unknown> = {
          quantityRemaining: batch.quantityRemaining,
        }
        if (batch.status === "depleted") {
          patch.status = "depleted"
        }
        return ctx.db.patch(batch.id, patch)
      })
    )

    // ═══════════════════════════════════════════════════════════════════════
    // 6. Insert stock adjustments (1-2 per product)
    // ═══════════════════════════════════════════════════════════════════════
    const adjustmentRecords: Array<{
      id: Id<"stockAdjustments">
      batchId: Id<"batches">
      productId: Id<"products">
      quantity: number
      reason: "damaged" | "lost" | "recount" | "system_reversal"
    }> = []

    for (const { id: pId, def } of productList) {
      const numAdjustments = rndInt(3, 5)
      const reasons: Array<"damaged" | "lost" | "recount" | "system_reversal"> =
        ["recount", "damaged", "lost", "system_reversal"]

      for (let i = 0; i < numAdjustments; i++) {
        const activeBatches = batchRecords.filter(
          (b) => b.productId === pId && b.quantityRemaining > 0
        )
        if (activeBatches.length === 0) continue

        const batch = rnd(activeBatches)
        const qty =
          def.baseUom === "piece"
            ? rndInt(1, 20)
            : toFloat(rndInt(1, 20) + Math.random())

        const reason = rnd(reasons)
        const userId = rnd(userIds)
        const isVoided = Math.random() < 0.1

        const adjDate = randDate(DATE_BASE, DATE_END)
        const adjId = await ctx.db.insert("stockAdjustments", {
          batchId: batch.id,
          productId: pId,
          userId,
          quantityAdjusted: qty,
          reason,
          status: isVoided ? "voided" : "applied",
          createdAt: adjDate.getTime(),
        })

        adjustmentRecords.push({
          id: adjId,
          batchId: batch.id,
          productId: pId,
          quantity: qty,
          reason,
        })

        // Apply to batch if not voided
        if (!isVoided) {
          const newRemaining = toFloat(batch.quantityRemaining - qty)
          batch.quantityRemaining = Math.max(0, newRemaining)
        }
      }
    }

    // ── Update batch quantities after adjustments ──
    for (const batch of batchRecords) {
      if (batch.quantityRemaining <= 0 && batch.status !== "depleted") {
        batch.status = "depleted"
      }
    }
    await Promise.all(
      batchRecords.map((batch) =>
        ctx.db.patch(batch.id, {
          quantityRemaining: batch.quantityRemaining,
          ...(batch.status === "depleted"
            ? { status: "depleted" as const }
            : {}),
        })
      )
    )

    // ═══════════════════════════════════════════════════════════════════════
    // 7. Update product quantities from active batches
    // ═══════════════════════════════════════════════════════════════════════
    await Promise.all(
      productList.map(async ({ id: pId, def }) => {
        const activeBatches = batchRecords.filter(
          (b) => b.productId === pId && b.quantityRemaining > 0
        )

        const totalQty = activeBatches.reduce(
          (sum, b) => sum + b.quantityRemaining,
          0
        )
        const currentQuantity =
          def.baseUom === "piece" ? Math.round(totalQty) : toFloat(totalQty)

        let totalAssetValue = 0
        if (activeBatches.length > 0) {
          const latest = activeBatches.reduce((a, b) =>
            a.createdDate > b.createdDate ? a : b
          )
          totalAssetValue = toFloat(currentQuantity * latest.unitCost)
        }

        await ctx.db.patch(pId, { currentQuantity, totalAssetValue })
      })
    )

    // ═══════════════════════════════════════════════════════════════════════
    // 8. Insert audit logs
    // ═══════════════════════════════════════════════════════════════════════
    const productByName: Record<string, ProductDef> = {}
    for (const def of PRODUCT_DEFS) {
      productByName[def.name] = def
    }

    const productNameById: Record<string, string> = {}
    for (const { id, def } of productList) {
      productNameById[id] = def.name
    }

    // Batch stock-in logs
    await Promise.all(
      batchRecords.map(async (batch) => {
        const productName = productNameById[batch.productId] ?? "Unknown"
        const pDef = productByName[productName]

        const totalReceived =
          batch.quantityRemaining +
          dispatchItemsToInsert
            .filter((d) => d.batchId === batch.id)
            .reduce((s, d) => s + d.quantityDeducted, 0)

        return ctx.db.insert("auditLogs", {
          userId: ownerId,
          action: "stock_in",
          description: JSON.stringify({
            summary: `Stocked in ${toFloat(totalReceived)} units of ${productName} (${batch.batchCode})`,
            details: {
              product: productName,
              batchCode: batch.batchCode,
              quantity: toFloat(totalReceived),
              uom: pDef?.baseUom ?? "piece",
            },
          }),
          resourceType: "batch",
          resourceId: batch.id,
          ipAddress: "127.0.0.1",
          userAgent: "Convex Seed",
          createdAt: batch.createdDate.getTime(),
        })
      })
    )

    // Dispatch stock-out logs
    const dispatchItemGroups: Record<string, typeof dispatchItemsToInsert> = {}
    for (const item of dispatchItemsToInsert) {
      const key = item.dispatchId
      if (!dispatchItemGroups[key]) dispatchItemGroups[key] = []
      dispatchItemGroups[key].push(item)
    }

    const dispatchLogPromises: Array<Promise<unknown>> = []
    for (const dispatch of dispatchRecords) {
      const items = dispatchItemGroups[dispatch.id]
      if (!items || items.length === 0) continue

      const products = items
        .map(
          (item) =>
            `${productNameById[item.productId] ?? "Unknown"} x ${item.dispatchQuantity} ${item.dispatchUom}`
        )
        .join("; ")

      dispatchLogPromises.push(
        ctx.db.insert("auditLogs", {
          userId: dispatch.userId,
          action: "stock_out",
          description: JSON.stringify({
            summary: `Dispatched ${items.length} product(s) (${toFloat(items.reduce((sum, item) => sum + item.dispatchQuantity, 0))} units)`,
            details: {
              totalItems: items.length,
              totalQuantity: toFloat(
                items.reduce((sum, item) => sum + item.dispatchQuantity, 0)
              ),
              products,
            },
          }),
          resourceType: "dispatch",
          resourceId: dispatch.id,
          ipAddress: "127.0.0.1",
          userAgent: "Convex Seed",
          createdAt: dispatch.createdDate.getTime(),
        })
      )
    }
    await Promise.all(dispatchLogPromises)

    // Adjustment audit logs
    const batchById = new Map<Id<"batches">, (typeof batchRecords)[0]>()
    for (const b of batchRecords) {
      batchById.set(b.id, b)
    }

    await Promise.all(
      adjustmentRecords.map(async (adj) => {
        const productName = productNameById[adj.productId] ?? "Unknown"
        const batch = batchById.get(adj.batchId)
        const batchCode = batch?.batchCode ?? "Unknown"
        const beforeRemaining = batch?.quantityRemaining ?? 0

        const logDate = randDate(DATE_BASE, DATE_END)
        return ctx.db.insert("auditLogs", {
          userId: ownerId,
          action: "stock_adjustment",
          description: JSON.stringify({
            summary: `Adjusted stock for ${productName} (${adj.reason === "damaged" || adj.reason === "lost" ? "deduct" : "add"}, ${adj.reason})`,
            details: {
              productName,
              quantityAdjusted: adj.quantity,
              reason: adj.reason,
              direction:
                adj.reason === "damaged" || adj.reason === "lost"
                  ? "deduct"
                  : "add",
              batchCode,
            },
            changes: {
              quantity_remaining: {
                old: beforeRemaining,
                new: Math.max(0, beforeRemaining - adj.quantity),
              },
            },
          }),
          resourceType: "batch",
          resourceId: adj.batchId,
          ipAddress: "127.0.0.1",
          userAgent: "Convex Seed",
          createdAt: logDate.getTime(),
        })
      })
    )

    // Auth event audit logs
    const authEvents: Array<Record<string, unknown>> = [
      {
        action: "auth_sign_in",
        email: process.env.STAFF_EMAIL ?? "juandelacruz@gmail.com",
        name: "Juan dela Cruz",
        role: "staff",
      },
      {
        action: "auth_sign_in_failed",
        email: process.env.STAFF_EMAIL ?? "juandelacruz@gmail.com",
        reason: "invalid_credentials",
      },
    ]

    const ownerEmail = process.env.OWNER_EMAIL
    if (ownerEmail) {
      authEvents.push(
        {
          action: "auth_sign_in",
          email: ownerEmail,
          name: "Owner",
          role: "owner",
        },
        {
          action: "auth_sign_in_failed",
          email: ownerEmail,
          reason: "invalid_credentials",
        }
      )
    }

    await Promise.all(
      authEvents.map((event) => {
        const logDate = randDate(DATE_BASE, DATE_END)
        return ctx.db.insert("auditLogs", {
          userId: ownerId,
          action: event.action as string,
          description: JSON.stringify(event),
          resourceType: "user",
          resourceId: ownerId,
          ipAddress: "127.0.0.1",
          userAgent: "Convex Seed",
          createdAt: logDate.getTime(),
        })
      })
    )

    // ═══════════════════════════════════════════════════════════════════════
    // Return summary
    // ═══════════════════════════════════════════════════════════════════════
    return {
      supplierCount: supplierIds.length,
      productCount: productList.length,
      batchCount: batchRecords.length,
      dispatchCount: dispatchRecords.length,
      dispatchItemCount: dispatchItemsToInsert.length,
      adjustmentCount: adjustmentRecords.length,
      auditLogCount: (await ctx.db.query("auditLogs").collect()).length,
    }
  },
})

// ─── Clear mutations (each runs in its own 4096-read budget) ─────────────

/**
 * Clears the largest table (dispatchItems) in its own execution budget.
 * Dispatch items are children of dispatches — deleted first.
 */
export const clearDispatchItems = internalMutation({
  handler: async (ctx) => {
    const docs = await ctx.db.query("dispatchItems").collect()
    await Promise.all(docs.map((d) => ctx.db.delete(d._id)))
  },
})

/**
 * Clears audit logs, stock adjustments, and dispatches.
 * These are mid-tier tables referenced by items but parents to nothing.
 */
export const clearDispatchesAndRelated = internalMutation({
  handler: async (ctx) => {
    const [logs, adjustments, dispatches] = await Promise.all([
      ctx.db.query("auditLogs").collect(),
      ctx.db.query("stockAdjustments").collect(),
      ctx.db.query("dispatches").collect(),
    ])
    await Promise.all([
      ...logs.map((l) => ctx.db.delete(l._id)),
      ...adjustments.map((a) => ctx.db.delete(a._id)),
      ...dispatches.map((d) => ctx.db.delete(d._id)),
    ])
  },
})

/**
 * Clears batches, products, and suppliers — the smallest tables and
 * the last to delete (parent tables).
 */
export const clearBatchesAndRest = internalMutation({
  handler: async (ctx) => {
    const [batches, products, suppliers] = await Promise.all([
      ctx.db.query("batches").collect(),
      ctx.db.query("products").collect(),
      ctx.db.query("suppliers").collect(),
    ])
    await Promise.all([
      ...batches.map((b) => ctx.db.delete(b._id)),
      ...products.map((p) => ctx.db.delete(p._id)),
      ...suppliers.map((s) => ctx.db.delete(s._id)),
    ])
  },
})
