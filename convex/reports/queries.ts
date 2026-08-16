import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { query } from "../_generated/server"
import { fetchAdjustments, fetchDispatches } from "../lib/fetch_entities"

/**
 * Returns dispatch and adjustment timestamps within a date range.
 * Queries both `by_creation_time` (production records) and
 * `by_createdAt` (seed/manual records) indexes and merges results.
 * The frontend buckets by day using its local timezone.
 * @param startMs - Start of the date range in milliseconds.
 * @param endMs - End of the date range in milliseconds.
 */
export const calendarSummary = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
  },
  handler: async (ctx, { startMs, endMs }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    const [dispatches, adjustments] = await Promise.all([
      fetchDispatches(ctx, startMs, endMs),
      fetchAdjustments(ctx, startMs, endMs),
    ])

    return {
      dispatchTimestamps: [
        ...new Set(dispatches.map((d) => d.createdAt ?? d._creationTime)),
      ],
      adjustmentTimestamps: [
        ...new Set(adjustments.map((a) => a.createdAt ?? a._creationTime)),
      ],
    }
  },
})

/**
 * Returns aggregate counts and totals for dispatches and adjustments
 * within a date range. Used by the monthly stats bar.
 * @param startMs - Start of the date range in milliseconds.
 * @param endMs - End of the date range in milliseconds.
 */
export const monthlyAggregates = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
  },
  handler: async (ctx, { startMs, endMs }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")

    const merged = await fetchDispatches(ctx, startMs, endMs, "completed")

    let totalItems = 0
    let totalValue = 0

    await Promise.all(
      merged.map(async (dispatch) => {
        if (
          dispatch.itemCount !== undefined &&
          dispatch.totalValue !== undefined
        ) {
          totalItems += dispatch.itemCount
          totalValue += dispatch.totalValue
          return
        }
        const items = await ctx.db
          .query("dispatchItems")
          .withIndex("by_dispatch", (q) => q.eq("dispatchId", dispatch._id))
          .collect()

        totalItems += dispatch.itemCount ?? items.length
        totalValue += items.reduce(
          (sum, item) => sum + item.quantityDeducted * item.unitCost,
          0
        )
      })
    )

    const adjustments = await fetchAdjustments(ctx, startMs, endMs)

    return {
      dispatchCount: merged.length,
      adjustmentCount: adjustments.length,
      totalItems,
      totalValue,
    }
  },
})

// ---------------------------------------------------------------------------
// CSV export queries
// ---------------------------------------------------------------------------

export const exportProducts = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
  },
  handler: async (ctx, { startMs, endMs }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

    const allProducts = await ctx.db.query("products").collect()
    const products = allProducts.filter((p) => {
      const ts = p.createdAt ?? p._creationTime
      return ts >= startMs && ts <= endMs
    })

    const productsWithSupplier = await Promise.all(
      products.map(async (p) => {
        const batches = await ctx.db
          .query("batches")
          .withIndex("by_product", (q) => q.eq("productId", p._id))
          .collect()

        const activeBatches = batches.filter((b) => b.status === "active")

        const lastSupplierId =
          activeBatches.length > 0
            ? [...activeBatches].sort(
                (a, b) => b._creationTime - a._creationTime
              )[0].supplierId
            : null

        let lastSupplierName = ""
        if (lastSupplierId) {
          const supplier = await ctx.db.get(lastSupplierId)
          if (supplier) lastSupplierName = supplier.companyName
        }

        return {
          _id: p._id,
          skuCode: p.skuCode,
          name: p.name,
          category: p.category,
          baseUom: p.baseUom,
          status: p.status,
          currentQuantity: p.currentQuantity,
          totalAssetValue: p.totalAssetValue,
          lowStockThreshold: p.lowStockThreshold,
          conversionFactor: p.conversionFactor,
          lastSupplier: lastSupplierName,
          batchCount: activeBatches.length,
        }
      })
    )

    return productsWithSupplier
  },
})

export const exportBatches = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
  },
  handler: async (ctx, { startMs, endMs }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

    const allBatches = await ctx.db.query("batches").collect()
    const batches = allBatches.filter((b) => {
      const ts = b.createdAt ?? b._creationTime
      return ts >= startMs && ts <= endMs
    })

    const enriched = await Promise.all(
      batches.map(async (b) => {
        const [product, supplier, user] = await Promise.all([
          ctx.db.get(b.productId),
          ctx.db.get(b.supplierId),
          ctx.db.get(b.userId),
        ])
        return {
          _id: b._id,
          batchCode: b.batchCode,
          productName: product?.name ?? "",
          category: product?.category ?? "",
          status: b.status,
          unitCost: b.unitCost,
          totalCost: b.totalProcurementCost,
          qtyReceived: b.quantityReceived,
          qtyRemaining: b.quantityRemaining,
          supplier: supplier?.companyName ?? "",
          receivedBy: user?.name ?? "",
          createdAt: b.createdAt ?? b._creationTime,
        }
      })
    )

    return enriched
  },
})

export const exportSuppliers = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
  },
  handler: async (ctx, { startMs, endMs }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

    const allSuppliers = await ctx.db.query("suppliers").collect()
    const suppliers = allSuppliers.filter(
      (s) => s._creationTime >= startMs && s._creationTime <= endMs
    )

    return suppliers.map((s) => ({
      _id: s._id,
      companyName: s.companyName,
      status: s.archivedAt ? "archived" : "active",
      contactPerson: s.contactPerson,
      contactNumber: s.contactNumber,
      address: s.address,
      batchCount: s.batchCount ?? 0,
    }))
  },
})

export const exportDispatches = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
  },
  handler: async (ctx, { startMs, endMs }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

    const merged = await fetchDispatches(ctx, startMs, endMs)

    const enriched = await Promise.all(
      merged.map(async (d) => {
        let userName = d.userName ?? ""
        if (!userName) {
          const user = await ctx.db.get(d.userId)
          if (user) userName = user.name ?? ""
        }

        let itemCount = d.itemCount ?? 0
        let totalValue = d.totalValue ?? 0
        if (d.totalValue === undefined || itemCount === 0) {
          const items = await ctx.db
            .query("dispatchItems")
            .withIndex("by_dispatch", (q) => q.eq("dispatchId", d._id))
            .collect()
          if (items.length > 0) {
            if (itemCount === 0) itemCount = items.length
            totalValue = items.reduce(
              (sum, i) => sum + i.quantityDeducted * i.unitCost,
              0
            )
          }
        }

        return {
          _id: d._id,
          date: d.createdAt ?? d._creationTime,
          status: d.status,
          orNumber: d.orNumber ?? "",
          customerRef: d.customerReference ?? "",
          dispatchedBy: userName,
          itemCount,
          totalValue,
        }
      })
    )

    return enriched
  },
})

export const exportDispatchItems = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
  },
  handler: async (ctx, { startMs, endMs }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

    const merged = await fetchDispatches(ctx, startMs, endMs)

    const rows: Array<{
      date: number
      status: string
      orNumber: string
      customerRef: string
      dispatchedBy: string
      product: string
      batchCode: string
      dispatchUom: string
      dispatchQty: number
      qtyDeducted: number
      unitCost: number
      lineTotal: number
    }> = []

    for (const d of merged) {
      const items = await ctx.db
        .query("dispatchItems")
        .withIndex("by_dispatch", (q) => q.eq("dispatchId", d._id))
        .collect()

      let userName = d.userName ?? ""
      if (!userName) {
        const user = await ctx.db.get(d.userId)
        if (user) userName = user.name ?? ""
      }

      for (const item of items) {
        const [product, batch] = await Promise.all([
          ctx.db.get(item.productId),
          ctx.db.get(item.batchId),
        ])

        rows.push({
          date: d.createdAt ?? d._creationTime,
          status: d.status,
          orNumber: d.orNumber ?? "",
          customerRef: d.customerReference ?? "",
          dispatchedBy: userName,
          product: product?.name ?? "",
          batchCode: batch?.batchCode ?? "",
          dispatchUom: item.dispatchUom,
          dispatchQty: item.dispatchQuantity,
          qtyDeducted: item.quantityDeducted,
          unitCost: item.unitCost,
          lineTotal: item.quantityDeducted * item.unitCost,
        })
      }
    }

    return rows
  },
})

export const exportAdjustments = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
  },
  handler: async (ctx, { startMs, endMs }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

    const merged = await fetchAdjustments(ctx, startMs, endMs)

    const enriched = await Promise.all(
      merged.map(async (a) => {
        const [product, batch, user] = await Promise.all([
          ctx.db.get(a.productId),
          ctx.db.get(a.batchId),
          ctx.db.get(a.userId),
        ])
        return {
          _id: a._id,
          date: a.createdAt ?? a._creationTime,
          product: product?.name ?? "",
          status: a.status,
          batchCode: batch?.batchCode ?? "",
          reason: a.reason,
          quantityAdjusted: a.quantityAdjusted,
          adjustedBy: user?.name ?? "",
        }
      })
    )

    return enriched
  },
})

// ---------------------------------------------------------------------------
// Monthly report composite query (for PDF generation — single client call)
// ---------------------------------------------------------------------------

export const exportMonthlyReport = query({
  args: {
    startMs: v.number(),
    endMs: v.number(),
  },
  handler: async (ctx, { startMs, endMs }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) throw new Error("Unauthorized")
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== "owner") throw new Error("Unauthorized")

    const mergedDispatches = await fetchDispatches(ctx, startMs, endMs)

    const mergedAdjustments = await fetchAdjustments(ctx, startMs, endMs)

    let totalItems = 0
    let totalValue = 0
    const dispatchItemsList: Array<{
      productName: string
      productCategory: string
      batchCode: string
      dispatchUom: string
      dispatchQty: number
      qtyDeducted: number
      unitCost: number
      lineTotal: number
      dispatchDate: number
      dispatchStatus: string
      customerRef: string
      dispatchedBy: string
    }> = []

    for (const d of mergedDispatches) {
      const items = await ctx.db
        .query("dispatchItems")
        .withIndex("by_dispatch", (q) => q.eq("dispatchId", d._id))
        .collect()

      let userName = d.userName ?? ""
      if (!userName) {
        const user = await ctx.db.get(d.userId)
        if (user) userName = user.name ?? ""
      }

      totalItems += d.itemCount ?? items.length

      for (const item of items) {
        const [product, batch] = await Promise.all([
          ctx.db.get(item.productId),
          ctx.db.get(item.batchId),
        ])

        const lineTotal = item.quantityDeducted * item.unitCost
        totalValue += lineTotal

        dispatchItemsList.push({
          productName: product?.name ?? "",
          productCategory: product?.category ?? "",
          batchCode: batch?.batchCode ?? "",
          dispatchUom: item.dispatchUom,
          dispatchQty: item.dispatchQuantity,
          qtyDeducted: item.quantityDeducted,
          unitCost: item.unitCost,
          lineTotal,
          dispatchDate: d.createdAt ?? d._creationTime,
          dispatchStatus: d.status,
          customerRef: d.customerReference ?? "",
          dispatchedBy: userName,
        })
      }
    }

    const adjustmentItemsList = await Promise.all(
      mergedAdjustments.map(async (a) => {
        const [product, batch, user] = await Promise.all([
          ctx.db.get(a.productId),
          ctx.db.get(a.batchId),
          ctx.db.get(a.userId),
        ])
        return {
          _id: a._id,
          date: a.createdAt ?? a._creationTime,
          product: product?.name ?? "",
          productCategory: product?.category ?? "",
          status: a.status,
          batchCode: batch?.batchCode ?? "",
          reason: a.reason,
          quantityAdjusted: a.quantityAdjusted,
          adjustedBy: user?.name ?? "",
        }
      })
    )

    const dispatchesPerDay = new Map<string, number>()
    for (const d of mergedDispatches) {
      const ts = d.createdAt ?? d._creationTime
      const day = new Date(ts).toLocaleDateString("en-CA")
      dispatchesPerDay.set(day, (dispatchesPerDay.get(day) ?? 0) + 1)
    }

    const categoryBreakdown = {
      sacks: 0,
      twines: 0,
    }
    for (const item of dispatchItemsList) {
      if (item.productCategory === "sacks") categoryBreakdown.sacks++
      else if (item.productCategory === "twines") categoryBreakdown.twines++
    }

    const adjustmentsByReason = new Map<string, number>()
    for (const a of mergedAdjustments) {
      adjustmentsByReason.set(
        a.reason,
        (adjustmentsByReason.get(a.reason) ?? 0) + 1
      )
    }

    const products = await ctx.db.query("products").collect()
    const lowStockProducts = products.filter(
      (p) => p.currentQuantity < p.lowStockThreshold && p.status === "active"
    )
    const topProducts = [...products]
      .filter((p) => p.status === "active")
      .sort((a, b) => b.currentQuantity - a.currentQuantity)
      .slice(0, 5)
      .map((p) => ({
        name: p.name,
        skuCode: p.skuCode,
        currentQuantity: p.currentQuantity,
      }))

    const suppliers = await ctx.db.query("suppliers").collect()

    return {
      dispatchCount: mergedDispatches.length,
      adjustmentCount: mergedAdjustments.length,
      totalItems,
      totalValue,
      dispatchesPerDay: Object.fromEntries(dispatchesPerDay),
      categoryBreakdown,
      adjustmentsByReason: Object.fromEntries(adjustmentsByReason),
      lowStockProducts: lowStockProducts.map((p) => ({
        name: p.name,
        skuCode: p.skuCode,
        currentQuantity: p.currentQuantity,
        lowStockThreshold: p.lowStockThreshold,
      })),
      topProducts,
      dispatches: dispatchItemsList,
      adjustments: adjustmentItemsList,
      productCount: products.filter((p) => p.status === "active").length,
      supplierCount: suppliers.filter((s) => !s.archivedAt).length,
    }
  },
})
