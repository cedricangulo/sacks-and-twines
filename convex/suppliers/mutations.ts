import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { mutation } from "../_generated/server"

export const create = mutation({
  args: {
    companyName: v.string(),
    contactPerson: v.string(),
    contactNumber: v.string(),
    address: v.string(),
  },
  handler: async (
    ctx,
    { companyName, contactPerson, contactNumber, address }
  ) => {
    const callerId = await getAuthUserId(ctx)
    if (callerId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(callerId)
    if (!caller || caller.role !== "owner")
      throw new Error("Only owners can create suppliers")

    const existing = await ctx.db
      .query("suppliers")
      .withIndex("by_company", (q) => q.eq("companyName", companyName))
      .first()
    if (existing !== null)
      throw new Error("A supplier with this company name already exists")

    const supplierId = await ctx.db.insert("suppliers", {
      companyName,
      contactPerson,
      contactNumber,
      address,
    })

    await ctx.db.insert("auditLogs", {
      userId: callerId,
      action: "supplier_create",
      description: `Created supplier ${companyName}`,
    })

    return supplierId
  },
})

export const update = mutation({
  args: {
    supplierId: v.id("suppliers"),
    companyName: v.string(),
    contactPerson: v.string(),
    contactNumber: v.string(),
    address: v.string(),
  },
  handler: async (
    ctx,
    { supplierId, companyName, contactPerson, contactNumber, address }
  ) => {
    const callerId = await getAuthUserId(ctx)
    if (callerId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(callerId)
    if (!caller || caller.role !== "owner")
      throw new Error("Only owners can update suppliers")

    const existing = await ctx.db.get(supplierId)
    if (!existing) throw new Error("Supplier not found")

    const duplicate = await ctx.db
      .query("suppliers")
      .withIndex("by_company", (q) => q.eq("companyName", companyName))
      .first()
    if (
      duplicate !== null &&
      duplicate._id.toString() !== supplierId.toString()
    ) {
      throw new Error("A supplier with this company name already exists")
    }

    await ctx.db.patch(supplierId, {
      companyName,
      contactPerson,
      contactNumber,
      address,
    })

    await ctx.db.insert("auditLogs", {
      userId: callerId,
      action: "supplier_update",
      description: `Updated supplier ${existing.companyName} → ${companyName}`,
    })

    return true
  },
})

export const archive = mutation({
  args: { supplierId: v.id("suppliers") },
  handler: async (ctx, { supplierId }) => {
    const callerId = await getAuthUserId(ctx)
    if (callerId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(callerId)
    if (!caller || caller.role !== "owner")
      throw new Error("Only owners can archive suppliers")

    const existing = await ctx.db.get(supplierId)
    if (!existing) throw new Error("Supplier not found")
    if (existing.archivedAt !== undefined)
      throw new Error("Supplier is already archived")

    const batches = await ctx.db
      .query("batches")
      .filter((q) => q.eq(q.field("supplierId"), supplierId))
      .collect()
    if (batches.length > 0) {
      throw new Error(
        "Cannot archive supplier with existing batch transactions"
      )
    }

    await ctx.db.patch(supplierId, { archivedAt: Date.now() })

    await ctx.db.insert("auditLogs", {
      userId: callerId,
      action: "supplier_archive",
      description: `Archived supplier ${existing.companyName}`,
    })

    return true
  },
})
