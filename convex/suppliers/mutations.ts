import { getAuthUserId } from "@convex-dev/auth/server"
import { zid } from "convex-helpers/server/zod4"
import { globalLimit, perUserLimit } from "../rate_limiter"
import { zMutation } from "../server"
import {
  archiveSupplierArgs,
  createSupplierArgs,
  unarchiveSupplierArgs,
  updateSupplierArgs,
} from "../validators/suppliers"

export const create = zMutation({
  args: createSupplierArgs,
  handler: async (
    ctx,
    { companyName, contactPerson, contactNumber, address, userAgent }
  ) => {
    const callerId = await getAuthUserId(ctx)
    if (callerId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(callerId)
    if (!caller || caller.role !== "owner")
      throw new Error("Only owners can create suppliers")

    await Promise.all([
      perUserLimit(ctx, "createSupplier", callerId),
      globalLimit(ctx, "globalCreateSupplier"),
    ])

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
      userAgent,
    })

    return supplierId
  },
})

export const update = zMutation({
  args: updateSupplierArgs,
  handler: async (
    ctx,
    {
      supplierId,
      companyName,
      contactPerson,
      contactNumber,
      address,
      userAgent,
    }
  ) => {
    const callerId = await getAuthUserId(ctx)
    if (callerId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(callerId)
    if (!caller || caller.role !== "owner")
      throw new Error("Only owners can update suppliers")

    await Promise.all([
      perUserLimit(ctx, "updateSupplier", callerId),
      globalLimit(ctx, "globalMutations"),
    ])

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
      userAgent,
    })

    return true
  },
})

export const archive = zMutation({
  args: archiveSupplierArgs,
  handler: async (ctx, { supplierId, userAgent }) => {
    const callerId = await getAuthUserId(ctx)
    if (callerId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(callerId)
    if (!caller || caller.role !== "owner")
      throw new Error("Only owners can archive suppliers")

    await Promise.all([
      perUserLimit(ctx, "archiveSupplier", callerId),
      globalLimit(ctx, "globalMutations"),
    ])

    const existing = await ctx.db.get(supplierId)
    if (!existing) throw new Error("Supplier not found")
    if (existing.archivedAt !== undefined)
      throw new Error("Supplier is already archived")

    const batches = await ctx.db
      .query("batches")
      .withIndex("by_supplier", (q) => q.eq("supplierId", supplierId))
      .collect()
    if (batches.length > 0) {
      throw new Error(
        "This supplier has existing batch records and cannot be archived."
      )
    }

    await ctx.db.patch(supplierId, { archivedAt: Date.now() })

    await ctx.db.insert("auditLogs", {
      userId: callerId,
      action: "supplier_archive",
      description: `Archived supplier ${existing.companyName}`,
      userAgent,
    })

    return true
  },
})

export const unarchive = zMutation({
  args: unarchiveSupplierArgs,
  handler: async (ctx, { supplierId, userAgent }) => {
    const callerId = await getAuthUserId(ctx)
    if (callerId === null) throw new Error("Unauthorized")

    const caller = await ctx.db.get(callerId)
    if (!caller || caller.role !== "owner")
      throw new Error("Only owners can unarchive suppliers")

    await Promise.all([
      perUserLimit(ctx, "archiveSupplier", callerId),
      globalLimit(ctx, "globalMutations"),
    ])

    const existing = await ctx.db.get(supplierId)
    if (!existing) throw new Error("Supplier not found")
    if (existing.archivedAt === undefined)
      throw new Error("Supplier is not archived")

    await ctx.db.patch(supplierId, { archivedAt: undefined })

    await ctx.db.insert("auditLogs", {
      userId: callerId,
      action: "supplier_unarchive",
      description: `Unarchived supplier ${existing.companyName}`,
      userAgent,
    })

    return true
  },
})
