import { v } from "convex/values"
import type { Doc, Id } from "./_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server"
import {
  CLEAR_CHUNK_LIMIT,
  DAILY_DISPATCH_MAX,
  DAILY_DISPATCH_MIN,
  DENSE_DAYS,
  NUM_BASELINE_DISPATCHES,
  SACKS_DEFAULT_PACK_SIZE,
  SEED_DATE_END,
  SEED_DATE_START,
} from "./lib/constants"
import { nextOrNumber } from "./lib/orNumber"

// ─── Helpers ───────────────────────────────────────────────────────────────

function rnd<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function rndInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randDate(start: Date, end: Date): Date {
  const ts = start.getTime() + Math.random() * (end.getTime() - start.getTime())
  const offset = 8 * 60 * 60 * 1000
  const localTs = ts + offset
  const localDate = new Date(localTs)
  const year = localDate.getUTCFullYear()
  const month = localDate.getUTCMonth()
  const day = localDate.getUTCDate()
  const hour = rndInt(8, 18)
  const minute = rndInt(0, 59)
  const second = rndInt(0, 59)
  return new Date(Date.UTC(year, month, day, hour - 8, minute, second))
}

function toFloat(n: number, decimals = 2): number {
  return parseFloat(n.toFixed(decimals))
}

const DATE_BASE = new Date(`${SEED_DATE_START}T00:00:00+08:00`)
const DATE_END = new Date(`${SEED_DATE_END}T00:00:00+08:00`)

/** PHT calendar parts of `DATE_END` for generated codes (`SKU-YYYYMMDD-*`). */
function phtParts(d: Date): { ymd: string; year: string } {
  const offset = 8 * 60 * 60 * 1000
  const local = new Date(d.getTime() + offset)
  const y = local.getUTCFullYear()
  const m = String(local.getUTCMonth() + 1).padStart(2, "0")
  const day = String(local.getUTCDate()).padStart(2, "0")
  return { ymd: `${y}${m}${day}`, year: String(y) }
}

const SEED_DS = phtParts(DATE_END)

let skuCounter = 0
function nextSkuCode(): string {
  skuCounter++
  const suffix = String(skuCounter).padStart(4, "0")
  return `SKU-${SEED_DS.ymd}-${suffix}`
}

let batchCounter = 0
function nextBatchCode(): string {
  batchCounter++
  const suffix = String(batchCounter).padStart(4, "0")
  return `BAT-${SEED_DS.ymd}-${suffix}`
}

// ─── Supplier definitions ──────────────────────────────────────────────────

const SUPPLIER_DEFS = [
  {
    companyName: "Central Luzon Sacks Corp.",
    contactPerson: "Miguel Ong",
    contactNumber: "0919-345-6783",
    address: "San Fernando, Pampanga",
  },
  {
    companyName: "Cordillera Twine Traders",
    contactPerson: "Carlos Lim",
    contactNumber: "0921-567-8905",
    address: "Baguio City, Benguet",
  },
  {
    companyName: "Manila Sack Industries",
    contactPerson: "Roberto Santos",
    contactNumber: "0917-123-4561",
    address: "Manila, Metro Manila",
  },
]

const ARCHIVED_SUPPLIER_DEF = {
  companyName: "Laguna Sack & Twine Supply",
  contactPerson: "Jose Reyes",
  contactNumber: "0918-234-5678",
  address: "Santa Cruz, Laguna",
}

// ─── Demo role assignments (seedAll) ─────────────────────────────────────────
// Fixed products play fixed demo roles so every inventory state is guaranteed
// no matter the random draws. All four are sacks (piece, threshold 100).
// - OUT_OF_STOCK: tiny early batches drain naturally through dispatches.
// - LOW_STOCK: tiny early batches drain, then one small restock batch arrives
//   near DATE_END (inserted post-dispatches by `writeEdgeCases`).
// - ARCHIVED: normal batches, archived at the end (history stays valid —
//   archiving has no history check, unlike supplier archiving).
// - VOID_BATCH: one batch pre-marked `voided` before any dispatch runs.
//   Production `voidBatch` rejects batches with dispatch history, so the voided
//   fixture must never be dispatch-eligible.
const OUT_OF_STOCK_PRODUCT_NAME = "Red bag"
const LOW_STOCK_PRODUCT_NAME = "Sand bag"
const ARCHIVED_PRODUCT_NAME = "Assorted Sack"
const VOID_BATCH_PRODUCT_NAME = "Laminated Sack"

// ─── Product definitions ───────────────────────────────────────────────────

interface ProductDef {
  name: string
  category: "sacks" | "twines" | "thread"
  baseUom: "piece" | "roll" | "meter"
  conversionFactor: number
  lowStockThreshold: number
  keywords?: string[]
}

const PRODUCT_DEFS: ProductDef[] = [
  // ── Sacks (5 products) ──
  {
    name: "Laminated Sack",
    category: "sacks",
    baseUom: "piece",
    conversionFactor: SACKS_DEFAULT_PACK_SIZE,
    lowStockThreshold: 100,
    keywords: ["sack", "laminated", "multi-wall"],
  },
  {
    name: "Assorted Sack",
    category: "sacks",
    baseUom: "piece",
    conversionFactor: SACKS_DEFAULT_PACK_SIZE,
    lowStockThreshold: 100,
    keywords: ["sack", "assorted"],
  },
  {
    name: "Woven Polypropylene Sack",
    category: "sacks",
    baseUom: "piece",
    conversionFactor: SACKS_DEFAULT_PACK_SIZE,
    lowStockThreshold: 100,
    keywords: ["sack", "pp", "polypropylene", "woven"],
  },
  {
    name: "Sand bag",
    category: "sacks",
    baseUom: "piece",
    conversionFactor: SACKS_DEFAULT_PACK_SIZE,
    lowStockThreshold: 100,
    keywords: ["sand", "bag", "construction"],
  },
  {
    name: "Red bag",
    category: "sacks",
    baseUom: "piece",
    conversionFactor: SACKS_DEFAULT_PACK_SIZE,
    lowStockThreshold: 100,
    keywords: ["red", "bag"],
  },
  // ── Twines (3 products) ──
  {
    name: "Sewing Twine",
    category: "twines",
    baseUom: "meter",
    conversionFactor: 0,
    lowStockThreshold: 50,
    keywords: ["twine", "sewing", "string"],
  },
  {
    name: "Banana Twine",
    category: "twines",
    baseUom: "meter",
    conversionFactor: 0,
    lowStockThreshold: 50,
    keywords: ["twine", "banana", "baling"],
  },
  {
    name: "Twist Twine",
    category: "twines",
    baseUom: "meter",
    conversionFactor: 0,
    lowStockThreshold: 50,
    keywords: ["twine", "twist", "straw", "hay", "tie"],
  },
  // ── Thread (3 products) ──
  {
    name: "Sewing Thread Small",
    category: "thread",
    baseUom: "roll",
    conversionFactor: 0,
    lowStockThreshold: 20,
    keywords: ["thread", "sewing", "small"],
  },
  {
    name: "Sewing Thread Medium",
    category: "thread",
    baseUom: "roll",
    conversionFactor: 0,
    lowStockThreshold: 20,
    keywords: ["thread", "sewing", "medium"],
  },
  {
    name: "Sewing Thread Large",
    category: "thread",
    baseUom: "roll",
    conversionFactor: 0,
    lowStockThreshold: 20,
    keywords: ["thread", "sewing", "large"],
  },
]

// ─── Product image mapping ──────────────────────────────────────────────────

const IMAGE_MAP: Record<string, string> = {
  "Laminated Sack": "kg2a8e4cnw51ej7exzg56v84yd8cfazd",
  "Assorted Sack": "kg21zqzp7q86xqf5sdhd61tg0n8ceh64",
  "Woven Polypropylene Sack": "kg21hew7qkknbqp4qzw874dvxh8ce7b8",
  "Sand bag": "kg28vzkddd5a3193gmj798xm418cege5",
  "Red bag": "kg2edpxzkvzkywkn1dngnm14c98cfm6h",
  "Sewing Twine": "kg2fxt8tx2v9e8kezc726jcpf58ce0eh",
  "Banana Twine": "kg22wkkhq95d09sgyhxjda5nns8cevtt",
  "Twist Twine": "kg234cp0dx6fdbgh3y72hz38kn8ce8c8",
  "Sewing Thread Small": "kg223dbvr4a3s5612997tr79ph8cek26",
  "Sewing Thread Medium": "kg2bay252262jhq59a922t9akh8cehaa",
  "Sewing Thread Large": "kg2cjh5shac7n98gzxgamh7zf98cf501",
}

// ─── Seed plan types & validators ──────────────────────────────────────────

interface SeedProductInfo {
  id: Id<"products">
  name: string
  baseUom: "piece" | "roll" | "meter"
}

interface SeedBatchInfo {
  id: Id<"batches">
  productId: Id<"products">
  unitCost: number
  baseUom: string
  batchCode: string
  createdDate: number
  quantityRemaining: number
  status: "active" | "depleted" | "voided"
}

interface SeedDispatchPlan {
  products: SeedProductInfo[]
  batches: SeedBatchInfo[]
}

interface DispatchSpec {
  userId: Id<"users">
  createdDate: number
  customerReference: string | undefined
  orNumber?: string
  items: Array<{
    batchId: Id<"batches">
    productId: Id<"products">
    dispatchUom: "piece" | "roll" | "meter"
    dispatchQuantity: number
    quantityDeducted: number
    unitCost: number
  }>
}

interface SeedDispatchResult {
  batches: SeedBatchInfo[]
  dispatchCount: number
  dispatchItemCount: number
  auditLogCount: number
}

const seedProductInfoValidator = v.object({
  id: v.id("products"),
  name: v.string(),
  baseUom: v.union(v.literal("piece"), v.literal("roll"), v.literal("meter")),
})

const seedBatchInfoValidator = v.object({
  id: v.id("batches"),
  productId: v.id("products"),
  unitCost: v.number(),
  baseUom: v.string(),
  batchCode: v.string(),
  createdDate: v.number(),
  quantityRemaining: v.number(),
  status: v.union(
    v.literal("active"),
    v.literal("depleted"),
    v.literal("voided")
  ),
})

const seedPlanValidator = v.object({
  products: v.array(seedProductInfoValidator),
  batches: v.array(seedBatchInfoValidator),
})

const seedUserIdsValidator = v.array(v.id("users"))
const seedUserNameMapValidator = v.record(v.id("users"), v.string())

// ─── Dense window helpers ───────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000
const DENSE_START = new Date(DATE_END.getTime() - (DENSE_DAYS - 1) * DAY_MS)

/**
 * Returns a +08:00 timestamp within the given calendar day at a random
 * business hour. Mirrors `randDate`'s offset math so day bucketing is stable.
 */
function businessHourTimestamp(dayStartMs: number): number {
  const offset = 8 * 60 * 60 * 1000
  const local = new Date(dayStartMs + offset)
  const year = local.getUTCFullYear()
  const month = local.getUTCMonth()
  const day = local.getUTCDate()
  const hour = rndInt(8, 18)
  const minute = rndInt(0, 59)
  const second = rndInt(0, 59)
  return Date.UTC(year, month, day, hour - 8, minute, second)
}

function nextCustomerReference(): string | undefined {
  const refs: Array<string | null> = [
    null,
    null,
    null,
    `PO-${SEED_DS.year}-${rndInt(1000, 9999)}`,
    `SO-${rndInt(100, 999)}`,
    `DR-${rndInt(1000, 9999)}`,
  ]
  return rnd(refs) ?? undefined
}

/**
 * Builds one dispatch spec, assigning items round-robin to the oldest
 * batches that still have stock and predate the dispatch. Mutates `batches`
 * remaining quantities. Returns null when no items could be placed.
 */
function buildDispatchSpec(
  userIds: Array<Id<"users">>,
  createdDate: number,
  plan: SeedDispatchPlan,
  batches: SeedBatchInfo[]
): DispatchSpec | null {
  const userId = rnd(userIds)
  const numItems = rndInt(1, 5)
  const usedProducts = new Set<Id<"products">>()
  const items: DispatchSpec["items"] = []

  for (let j = 0; j < numItems; j++) {
    const available = plan.products.filter((p) => !usedProducts.has(p.id))
    if (available.length === 0) break
    const product = rnd(available)
    usedProducts.add(product.id)

    const dispatchQty =
      product.baseUom === "piece"
        ? rndInt(5, 50)
        : product.baseUom === "roll"
          ? rndInt(1, 10)
          : toFloat(rndInt(2, 30) + Math.random())
    const qtyDeducted =
      product.baseUom === "meter" ? toFloat(dispatchQty) : dispatchQty

    const productBatches = batches.filter(
      (b) =>
        b.productId === product.id &&
        b.status === "active" &&
        b.createdDate <= createdDate &&
        b.quantityRemaining > 0
    )
    if (productBatches.length === 0) continue

    const candidates = productBatches.filter(
      (b) => b.quantityRemaining >= qtyDeducted
    )
    const pool = candidates.length > 0 ? candidates : productBatches
    const batch = pool.reduce((a, b) =>
      a.quantityRemaining > b.quantityRemaining ? a : b
    )

    items.push({
      batchId: batch.id,
      productId: product.id,
      dispatchUom: product.baseUom,
      dispatchQuantity: dispatchQty,
      quantityDeducted: qtyDeducted,
      unitCost: batch.unitCost,
    })

    batch.quantityRemaining =
      product.baseUom === "meter"
        ? toFloat(batch.quantityRemaining - qtyDeducted)
        : batch.quantityRemaining - qtyDeducted
  }

  if (items.length === 0) return null
  return {
    userId,
    createdDate,
    customerReference: nextCustomerReference(),
    items,
  }
}

/**
 * Inserts dispatches, their dispatch items, and stock-out audit logs for a
 * batch of generated dispatch dates. Each mutation invocation stays well
 * within Convex's write budget because the action slices the work into
 * chunks. Returns the (mutated) batch state for the next chunk.
 */
async function seedDispatches(
  ctx: MutationCtx,
  plan: SeedDispatchPlan,
  userIds: Array<Id<"users">>,
  userNameMap: Record<string, string>,
  createdDates: number[]
): Promise<SeedDispatchResult> {
  const batches = plan.batches.map((b) => ({ ...b }))
  const productNameById: Record<string, string> = {}
  for (const p of plan.products) productNameById[p.id] = p.name

  const specs: DispatchSpec[] = []
  for (const createdDate of createdDates) {
    const spec = buildDispatchSpec(userIds, createdDate, plan, batches)
    if (spec) specs.push(spec)
  }

  // Reserve OR numbers sequentially: each candidate must be unique against both
  // existing dispatches and the other specs in this chunk. The inserts below
  // are the only concurrent work.
  const orNumbers: string[] = []
  const reservedOrNumbers = new Set<string>()
  for (const spec of specs) {
    let orNumber = await nextOrNumber(ctx, spec.createdDate)
    while (reservedOrNumbers.has(orNumber)) {
      orNumber = await nextOrNumber(ctx, spec.createdDate)
    }
    reservedOrNumbers.add(orNumber)
    orNumbers.push(orNumber)
  }

  const dispatchIds = await Promise.all(
    specs.map((spec, index) =>
      ctx.db.insert("dispatches", {
        userId: spec.userId,
        customerReference: spec.customerReference,
        orNumber: orNumbers[index],
        userName: userNameMap[spec.userId],
        itemCount: spec.items.length,
        totalQuantity: toFloat(
          spec.items.reduce((sum, item) => sum + item.dispatchQuantity, 0)
        ),
        totalValue: toFloat(
          spec.items.reduce(
            (sum, item) => sum + item.quantityDeducted * item.unitCost,
            0
          )
        ),
        createdAt: spec.createdDate,
      })
    )
  )

  const dispatchIdBySpec = new Map<number, Id<"dispatches">>()
  dispatchIds.forEach((dispatchId, index) => {
    dispatchIdBySpec.set(index, dispatchId)
  })

  const itemPromises: Array<Promise<unknown>> = []
  const logPromises: Array<Promise<unknown>> = []
  for (const [index, spec] of specs.entries()) {
    const dispatchId = dispatchIdBySpec.get(index)
    if (!dispatchId) continue

    for (const item of spec.items) {
      itemPromises.push(
        ctx.db.insert("dispatchItems", {
          dispatchId,
          batchId: item.batchId,
          productId: item.productId,
          dispatchUom: item.dispatchUom,
          dispatchQuantity: item.dispatchQuantity,
          quantityDeducted: item.quantityDeducted,
          unitCost: item.unitCost,
          createdAt: spec.createdDate,
        })
      )
    }

    const products = spec.items
      .map(
        (item) =>
          `${productNameById[item.productId] ?? "Unknown"} x ${item.dispatchQuantity} ${item.dispatchUom}`
      )
      .join("; ")

    logPromises.push(
      ctx.db.insert("auditLogs", {
        userId: spec.userId,
        action: "stock_out",
        description: JSON.stringify({
          summary: `Dispatched ${spec.items.length} product(s) (${toFloat(spec.items.reduce((sum, item) => sum + item.dispatchQuantity, 0))} units)`,
          details: {
            totalItems: spec.items.length,
            totalQuantity: toFloat(
              spec.items.reduce((sum, item) => sum + item.dispatchQuantity, 0)
            ),
            products,
          },
        }),
        resourceType: "dispatch",
        resourceId: dispatchId,
        ipAddress: "127.0.0.1",
        userAgent: "Convex Seed",
        createdAt: spec.createdDate,
      })
    )
  }

  await Promise.all([...itemPromises, ...logPromises])

  return {
    batches,
    dispatchCount: specs.length,
    dispatchItemCount: specs.reduce((sum, s) => sum + s.items.length, 0),
    auditLogCount: specs.length,
  }
}

// ─── Internal Mutation: writeBase ──────────────────────────────────────────

/**
 * Writes suppliers, products, and batches. Batch quantities are sized so the
 * dense dispatch window (≥20 dispatches/day) never exhausts stock, and batch
 * dates are spread across the range so late dispatches always have stock.
 * Inserts the batch stock-in audit logs. Internal — called by `seedAll`.
 */
export const writeBase = internalMutation({
  args: {
    ownerId: v.id("users"),
    staffId: v.id("users"),
  },
  handler: async (ctx, { ownerId, staffId }) => {
    // `nextSkuCode()` is a global counter: reserve the codes sequentially first
    // so the concurrent inserts below keep deterministic SKU order. Supplier
    // and product inserts are independent, so they race in one `Promise.all`.
    const skuCodes = PRODUCT_DEFS.map(() => nextSkuCode())
    const [allSupplierIds, productResults] = await Promise.all([
      Promise.all(
        [...SUPPLIER_DEFS, ARCHIVED_SUPPLIER_DEF].map((def) =>
          ctx.db.insert("suppliers", def)
        )
      ),
      Promise.all(
        PRODUCT_DEFS.map(async (def, index) => {
          const productCreatedAt = randDate(DATE_BASE, DATE_END)
          const id = await ctx.db.insert("products", {
            skuCode: skuCodes[index],
            name: def.name,
            category: def.category,
            baseUom: def.baseUom,
            conversionFactor: def.conversionFactor,
            currentQuantity: 0,
            totalAssetValue: 0,
            lowStockThreshold: def.lowStockThreshold,
            status: "active",
            imagePath: IMAGE_MAP[def.name],
            createdAt: productCreatedAt.getTime(),
            ...(def.keywords ? { keywords: def.keywords } : {}),
          })
          return { id, def }
        })
      ),
    ])

    // The archived supplier fixture must hold zero batches: production archive
    // blocks suppliers with batch records, so archive it here before any batch
    // references a supplier. Active batches only draw from `supplierIds`.
    const archivedSupplierId = allSupplierIds[allSupplierIds.length - 1]
    const supplierIds = allSupplierIds.slice(0, -1)
    await ctx.db.patch(archivedSupplierId, { archivedAt: Date.now() })
    await ctx.db.insert("auditLogs", {
      userId: ownerId,
      action: "supplier_archive",
      description: `Archived supplier ${ARCHIVED_SUPPLIER_DEF.companyName}`,
      resourceType: "supplier",
      resourceId: archivedSupplierId,
      ipAddress: "127.0.0.1",
      userAgent: "Convex Seed",
      createdAt: DATE_END.getTime(),
    })

    const productMap: Record<string, { id: Id<"products">; def: ProductDef }> =
      {}
    for (const { id, def } of productResults) {
      productMap[def.name] = { id, def }
    }
    const productList = Object.values(productMap)

    const userIds = [ownerId, staffId]
    const batches: SeedBatchInfo[] = []
    const productBatchCounts: Array<{ id: Id<"products">; count: number }> = []
    const totalSpan = DATE_END.getTime() - DATE_BASE.getTime()
    const batchPlans: Array<{
      productId: Id<"products">
      supplierId: Id<"suppliers">
      userId: Id<"users">
      batchCode: string
      totalProcurementCost: number
      unitCost: number
      quantity: number
      createdAt: number
      productName: string
      productUom: ProductDef["baseUom"]
      status: "active" | "voided"
    }> = []
    const stockInLogs: Array<{
      userId: Id<"users">
      description: string
      resourceId: Id<"batches">
      createdAt: number
    }> = []

    // Plan every random batch field sequentially so `nextBatchCode()` and the
    // random draws keep their deterministic order. The inserts below are the
    // only concurrent work: each plan is already fully specified.
    for (const { id: pId, def } of productList) {
      const numBatches = rndInt(6, 8)
      // Drain-role products (out-of-stock + low-stock) get tiny early batches
      // so the ~2k-dispatch pipeline genuinely consumes them to zero. Normal
      // demand per product is ~15k piece-units; ~900 units cannot survive it.
      const isDrainRole =
        def.name === OUT_OF_STOCK_PRODUCT_NAME ||
        def.name === LOW_STOCK_PRODUCT_NAME
      for (let i = 0; i < numBatches; i++) {
        // Every product gets one batch before the dense window so it always
        // has eligible stock from the very first dense day onward. Drain-role
        // products date every batch early so nothing escapes consumption.
        const batchDate =
          i === 0 || isDrainRole
            ? randDate(DATE_BASE, DENSE_START)
            : new Date(
                DATE_BASE.getTime() +
                  Math.min(
                    totalSpan,
                    totalSpan *
                      ((i + 1) / numBatches) *
                      (0.75 + Math.random() * 0.5)
                  )
              )

        const supplierId = rnd(supplierIds)
        const userId = rnd(userIds)
        const unitCost =
          def.baseUom === "piece"
            ? toFloat(rndInt(45, 95) + Math.random())
            : def.baseUom === "roll"
              ? toFloat(rndInt(80, 200) + Math.random())
              : toFloat(rndInt(120, 280) + Math.random())

        const qty = isDrainRole
          ? def.baseUom === "piece"
            ? rndInt(100, 200)
            : def.baseUom === "roll"
              ? rndInt(20, 40)
              : toFloat(rndInt(100, 200) + Math.random())
          : def.baseUom === "piece"
            ? rndInt(1500, 4500)
            : def.baseUom === "roll"
              ? rndInt(300, 700)
              : toFloat(rndInt(800, 2000) + Math.random())

        // One batch is voided before any dispatch runs, so it is never
        // dispatch-eligible — matching the production rule that voiding
        // rejects batches with dispatch history.
        const isVoided = def.name === VOID_BATCH_PRODUCT_NAME && i === 0

        batchPlans.push({
          productId: pId,
          supplierId,
          userId,
          batchCode: nextBatchCode(),
          totalProcurementCost: toFloat(unitCost * qty),
          unitCost,
          quantity: qty,
          createdAt: batchDate.getTime(),
          productName: def.name,
          productUom: def.baseUom,
          status: isVoided ? "voided" : "active",
        })
      }
      productBatchCounts.push({ id: pId, count: numBatches })
    }

    const batchIds = await Promise.all(
      batchPlans.map((plan) =>
        ctx.db.insert("batches", {
          productId: plan.productId,
          supplierId: plan.supplierId,
          userId: plan.userId,
          batchCode: plan.batchCode,
          totalProcurementCost: plan.totalProcurementCost,
          unitCost: plan.unitCost,
          quantityReceived: plan.quantity,
          quantityRemaining: plan.quantity,
          status: plan.status,
          createdAt: plan.createdAt,
        })
      )
    )

    let batchVoidLogCount = 0
    const voidLogPromises: Array<Promise<unknown>> = []
    batchPlans.forEach((plan, index) => {
      const batchId = batchIds[index]
      batches.push({
        id: batchId,
        productId: plan.productId,
        unitCost: plan.unitCost,
        baseUom: plan.productUom,
        batchCode: plan.batchCode,
        createdDate: plan.createdAt,
        quantityRemaining: plan.quantity,
        status: plan.status,
      })

      stockInLogs.push({
        userId: ownerId,
        description: JSON.stringify({
          summary: `Stocked in ${toFloat(plan.quantity)} units of ${plan.productName} (${plan.batchCode})`,
          details: {
            product: plan.productName,
            batchCode: plan.batchCode,
            quantity: toFloat(plan.quantity),
            uom: plan.productUom,
          },
        }),
        resourceId: batchId,
        createdAt: plan.createdAt,
      })

      if (plan.status === "voided") {
        batchVoidLogCount++
        // Voided after its stock-in, before any dispatch could touch it.
        voidLogPromises.push(
          ctx.db.insert("auditLogs", {
            userId: ownerId,
            action: "batch_void",
            description: JSON.stringify({
              summary: `Voided batch ${plan.batchCode} — removed ${toFloat(plan.quantity)} units from ${plan.productName}`,
              details: {
                batchCode: plan.batchCode,
                product: plan.productName,
                unitsRemoved: toFloat(plan.quantity),
                costRemoved: plan.totalProcurementCost,
                voidedAdjustments: 0,
                reason: "Seed fixture: damaged on arrival",
              },
            }),
            resourceType: "batch",
            resourceId: batchId,
            ipAddress: "127.0.0.1",
            userAgent: "Convex Seed",
            // Voided the day after stock-in, before any dispatch could
            // touch it (`+ DAY_MS` keeps the log after the batch date).
            createdAt: businessHourTimestamp(plan.createdAt + DAY_MS),
          })
        )
      }
    })
    await Promise.all(voidLogPromises)

    await Promise.all(
      productBatchCounts.map(({ id, count }) =>
        ctx.db.patch(id, { batchCount: count })
      )
    )

    await Promise.all(
      stockInLogs.map((log) =>
        ctx.db.insert("auditLogs", {
          userId: log.userId,
          action: "stock_in",
          description: log.description,
          resourceType: "batch",
          resourceId: log.resourceId,
          ipAddress: "127.0.0.1",
          userAgent: "Convex Seed",
          createdAt: log.createdAt,
        })
      )
    )

    return {
      products: productList.map(({ id, def }) => ({
        id,
        name: def.name,
        baseUom: def.baseUom,
      })),
      batches,
      supplierCount: allSupplierIds.length,
      auditLogCount: stockInLogs.length + 1 + batchVoidLogCount,
    }
  },
})

// ─── Internal Mutation: writeBaselineDispatches ────────────────────────────

/**
 * Writes the historical (pre-dense-window) dispatches — the same sparse
 * peak-weighted spread as the original seed, restricted to dates before
 * `DENSE_START`. Internal — called by `seedAll`.
 */
export const writeBaselineDispatches = internalMutation({
  args: {
    plan: seedPlanValidator,
    userIds: seedUserIdsValidator,
    userNameMap: seedUserNameMapValidator,
  },
  handler: async (ctx, { plan, userIds, userNameMap }) => {
    // Peak window trails the dense window by a year so baseline density stays
    // stable as DATE_END rolls forward (a fixed date would thin out over time).
    const baselinePeakStart = new Date(DENSE_START.getTime() - 365 * DAY_MS)
    const dates: number[] = []
    for (let i = 0; i < NUM_BASELINE_DISPATCHES; i++) {
      const isPeak = Math.random() < 0.85
      const dBase = isPeak
        ? randDate(baselinePeakStart, DENSE_START)
        : randDate(DATE_BASE, baselinePeakStart)
      dates.push(dBase.getTime())
    }
    return seedDispatches(ctx, plan, userIds, userNameMap, dates)
  },
})

// ─── Internal Mutation: writeDispatchChunk ─────────────────────────────────

/**
 * Writes one slice of the dense window: every calendar day in the slice gets
 * `DAILY_DISPATCH_MIN..MAX` dispatches at business hours. Internal — called
 * by `seedAll` in a loop so each call stays within transaction limits.
 */
export const writeDispatchChunk = internalMutation({
  args: {
    plan: seedPlanValidator,
    userIds: seedUserIdsValidator,
    userNameMap: seedUserNameMapValidator,
    startDayIndex: v.number(),
    dayCount: v.number(),
  },
  handler: async (
    ctx,
    { plan, userIds, userNameMap, startDayIndex, dayCount }
  ) => {
    const dates: number[] = []
    for (let i = 0; i < dayCount; i++) {
      const dayMs = DENSE_START.getTime() + (startDayIndex + i) * DAY_MS
      const numDispatches = rndInt(DAILY_DISPATCH_MIN, DAILY_DISPATCH_MAX)
      for (let d = 0; d < numDispatches; d++) {
        dates.push(businessHourTimestamp(dayMs))
      }
    }
    return seedDispatches(ctx, plan, userIds, userNameMap, dates)
  },
})

// ─── Internal Mutation: writeAdjustments ───────────────────────────────────

/**
 * Writes stock adjustments (3-5 per product, ~10% voided) and their audit
 * logs, applying non-voided quantities to the threaded batch state.
 * Internal — called by `seedAll`.
 */
export const writeAdjustments = internalMutation({
  args: {
    plan: seedPlanValidator,
    userIds: seedUserIdsValidator,
    ownerId: v.id("users"),
  },
  handler: async (ctx, { plan, userIds, ownerId }) => {
    const batches = plan.batches.map((b) => ({ ...b }))
    const productNameById: Record<string, string> = {}
    for (const p of plan.products) productNameById[p.id] = p.name
    const reasons: Array<"damaged" | "lost" | "recount" | "system_reversal"> = [
      "recount",
      "damaged",
      "lost",
      "system_reversal",
    ]

    const describeAdjustment = (
      productName: string,
      qty: number,
      reason: (typeof reasons)[number],
      batchCode: string,
      beforeRemaining: number
    ): string =>
      JSON.stringify({
        summary: `Adjusted stock for ${productName} (${reason === "damaged" || reason === "lost" ? "deduct" : "add"}, ${reason})`,
        details: {
          productName,
          quantityAdjusted: qty,
          reason,
          direction:
            reason === "damaged" || reason === "lost" ? "deduct" : "add",
          batchCode,
        },
        changes: {
          quantity_remaining: {
            old: beforeRemaining,
            new: Math.max(0, beforeRemaining - qty),
          },
        },
      })

    const adjRows: Array<{
      batchId: Id<"batches">
      productId: Id<"products">
      userId: Id<"users">
      quantityAdjusted: number
      reason: "damaged" | "lost" | "recount" | "system_reversal"
      status: "applied" | "voided"
      createdAt: number
    }> = []
    const logRows: Array<{
      userId: Id<"users">
      description: string
      resourceId: Id<"batches">
      createdAt: number
    }> = []

    for (const product of plan.products) {
      const numAdjustments = rndInt(3, 5)
      for (let i = 0; i < numAdjustments; i++) {
        // Voided batches are excluded: their stock is already reversed and
        // production treats their adjustments as voided too.
        const activeBatches = batches.filter(
          (b) =>
            b.productId === product.id &&
            b.status === "active" &&
            b.quantityRemaining > 0
        )
        if (activeBatches.length === 0) continue

        const batch = rnd(activeBatches)
        const qty =
          product.baseUom === "meter"
            ? toFloat(rndInt(1, 20) + Math.random())
            : rndInt(1, 20)
        const reason = rnd(reasons)
        const userId = rnd(userIds)
        const isVoided = Math.random() < 0.1
        const adjDate = randDate(DATE_BASE, DATE_END)
        const beforeRemaining = batch.quantityRemaining

        adjRows.push({
          batchId: batch.id,
          productId: product.id,
          userId,
          quantityAdjusted: qty,
          reason,
          status: isVoided ? ("voided" as const) : ("applied" as const),
          createdAt: adjDate.getTime(),
        })

        logRows.push({
          userId: ownerId,
          description: describeAdjustment(
            productNameById[product.id] ?? "Unknown",
            qty,
            reason,
            batch.batchCode,
            beforeRemaining
          ),
          resourceId: batch.id,
          createdAt: adjDate.getTime(),
        })

        if (!isVoided) {
          batch.quantityRemaining =
            product.baseUom === "meter"
              ? Math.max(0, toFloat(batch.quantityRemaining - qty))
              : Math.max(0, batch.quantityRemaining - qty)
        }
      }
    }

    // Guarantees so every adjustment state has demo data: at least one voided
    // row (the ~10% draw can miss) and at least one of each reason. Log
    // descriptions carry no status, so flipping the last row to voided keeps
    // its log valid; missing reasons are appended as small applied rows.
    if (!adjRows.some((r) => r.status === "voided") && adjRows.length > 0) {
      const last = adjRows[adjRows.length - 1]
      last.status = "voided"
      const batch = batches.find((b) => b.id === last.batchId)
      if (batch) {
        const product = plan.products.find((p) => p.id === last.productId)
        batch.quantityRemaining =
          product?.baseUom === "meter"
            ? toFloat(batch.quantityRemaining + last.quantityAdjusted)
            : batch.quantityRemaining + last.quantityAdjusted
      }
    }
    const seenReasons = new Set(adjRows.map((r) => r.reason))
    for (const reason of reasons) {
      if (seenReasons.has(reason)) continue
      const target = batches.find(
        (b) => b.status === "active" && b.quantityRemaining > 10
      )
      if (!target) continue
      const targetProduct = plan.products.find((p) => p.id === target.productId)
      if (!targetProduct) continue
      const reasonQty =
        targetProduct.baseUom === "meter"
          ? toFloat(rndInt(1, 20) + Math.random())
          : rndInt(1, 20)
      const reasonDate = randDate(DATE_BASE, DATE_END)
      const reasonBefore = target.quantityRemaining
      adjRows.push({
        batchId: target.id,
        productId: target.productId,
        userId: rnd(userIds),
        quantityAdjusted: reasonQty,
        reason,
        status: "applied",
        createdAt: reasonDate.getTime(),
      })
      logRows.push({
        userId: ownerId,
        description: describeAdjustment(
          productNameById[target.productId] ?? "Unknown",
          reasonQty,
          reason,
          target.batchCode,
          reasonBefore
        ),
        resourceId: target.id,
        createdAt: reasonDate.getTime(),
      })
      target.quantityRemaining =
        targetProduct.baseUom === "meter"
          ? Math.max(0, toFloat(target.quantityRemaining - reasonQty))
          : Math.max(0, target.quantityRemaining - reasonQty)
      seenReasons.add(reason)
    }

    await Promise.all(
      adjRows.map((row) => ctx.db.insert("stockAdjustments", row))
    )
    await Promise.all(
      logRows.map((log) =>
        ctx.db.insert("auditLogs", {
          userId: log.userId,
          action: "stock_adjustment",
          description: log.description,
          resourceType: "batch",
          resourceId: log.resourceId,
          ipAddress: "127.0.0.1",
          userAgent: "Convex Seed",
          createdAt: log.createdAt,
        })
      )
    )

    return {
      batches,
      adjustmentCount: adjRows.length,
      auditLogCount: logRows.length,
    }
  },
})

// ─── Internal Mutation: finalizeQuantities ─────────────────────────────────

/**
 * Persists the threaded batch remaining quantities (marking depleted batches)
 * and recomputes each product's current quantity and asset value from its
 * active batches. Internal — called by `seedAll`.
 */
export const finalizeQuantities = internalMutation({
  args: {
    plan: seedPlanValidator,
  },
  handler: async (ctx, { plan }) => {
    await Promise.all(
      plan.batches.map((b) => {
        const remaining = Math.max(0, b.quantityRemaining)
        // Voided batches keep their status: voiding already reversed their
        // stock, and re-marking them active would resurrect phantom quantity.
        const status =
          b.status === "voided"
            ? ("voided" as const)
            : remaining <= 0
              ? ("depleted" as const)
              : ("active" as const)
        return ctx.db.patch(b.id, {
          quantityRemaining: remaining,
          status,
        })
      })
    )

    await Promise.all(
      plan.products.map(async (p) => {
        // Voided batches hold no sellable stock — exclude them the same way
        // production voiding subtracts their remaining from the product.
        const activeBatches = plan.batches.filter(
          (b) =>
            b.productId === p.id &&
            b.status !== "voided" &&
            b.quantityRemaining > 0
        )
        const totalQty = activeBatches.reduce(
          (sum, b) => sum + b.quantityRemaining,
          0
        )
        const currentQuantity =
          p.baseUom === "meter" ? toFloat(totalQty) : Math.round(totalQty)

        let totalAssetValue = 0
        if (activeBatches.length > 0) {
          const latest = activeBatches.reduce((a, b) =>
            a.createdDate > b.createdDate ? a : b
          )
          totalAssetValue = toFloat(currentQuantity * latest.unitCost)
        }

        await ctx.db.patch(p.id, { currentQuantity, totalAssetValue })
      })
    )

    return {}
  },
})

// ─── Internal Mutation: writeEdgeCases ─────────────────────────────────────

/**
 * Carves the remaining guaranteed demo states after `finalizeQuantities`:
 * archives one product, restocks the drained low-stock product with one small
 * late batch, and safety-drains the out-of-stock product if the dispatch
 * pipeline somehow left stock behind. Runs after dispatches so the restock
 * batch (dated today) is never consumed by seeded dispatches.
 * Internal — called by `seedAll`.
 */
export const writeEdgeCases = internalMutation({
  args: {
    plan: seedPlanValidator,
    ownerId: v.id("users"),
  },
  handler: async (ctx, { plan, ownerId }) => {
    let auditLogCount = 0
    const productByName = new Map(plan.products.map((p) => [p.name, p]))

    // ── 1. Archive one product (history stays valid) ───────────────────
    const archived = productByName.get(ARCHIVED_PRODUCT_NAME)
    if (archived) {
      const doc = await ctx.db.get(archived.id)
      if (doc && doc.status !== "archived") {
        await ctx.db.patch(archived.id, { status: "archived" })
        await ctx.db.insert("auditLogs", {
          userId: ownerId,
          action: "product_archive",
          description: `Archived product ${doc.name} (${doc.skuCode})`,
          resourceType: "product",
          resourceId: archived.id,
          ipAddress: "127.0.0.1",
          userAgent: "Convex Seed",
          createdAt: DATE_END.getTime(),
        })
        auditLogCount++
      }
    }

    // ── 2. Restock the low-stock product with one small late batch ─────
    // Its writeBase batches were sized to drain to zero; this arrival near
    // DATE_END leaves it just under its low-stock threshold.
    const lowStock = productByName.get(LOW_STOCK_PRODUCT_NAME)
    if (lowStock) {
      const [lowDoc, lowBatches] = await Promise.all([
        ctx.db.get(lowStock.id),
        ctx.db
          .query("batches")
          .withIndex("by_product", (q) => q.eq("productId", lowStock.id))
          .collect(),
      ])
      if (lowDoc) {
        const threshold = lowDoc.lowStockThreshold
        const restockQty = Math.max(1, Math.floor(threshold - 10))
        const latest = lowBatches.reduce<Doc<"batches"> | null>(
          (a, b) => (a && a.createdAt! > b.createdAt! ? a : b),
          null
        )
        const supplier = await ctx.db.query("suppliers").first()
        if (latest && supplier) {
          const batchCode = nextBatchCode()
          const restockAt = businessHourTimestamp(DATE_END.getTime())
          const restockId = await ctx.db.insert("batches", {
            productId: lowStock.id,
            supplierId: supplier._id,
            userId: ownerId,
            batchCode,
            totalProcurementCost: toFloat(latest.unitCost * restockQty),
            unitCost: latest.unitCost,
            quantityReceived: restockQty,
            quantityRemaining: restockQty,
            status: "active",
            createdAt: restockAt,
          })
          await ctx.db.insert("auditLogs", {
            userId: ownerId,
            action: "stock_in",
            description: JSON.stringify({
              summary: `Stocked in ${toFloat(restockQty)} units of ${lowDoc.name} (${batchCode})`,
              details: {
                product: lowDoc.name,
                batchCode,
                quantity: toFloat(restockQty),
                uom: lowStock.baseUom,
              },
            }),
            resourceType: "batch",
            resourceId: restockId,
            ipAddress: "127.0.0.1",
            userAgent: "Convex Seed",
            createdAt: restockAt,
          })
          auditLogCount++
          const currentQuantity =
            lowStock.baseUom === "meter"
              ? toFloat(restockQty)
              : Math.round(restockQty)
          await ctx.db.patch(lowStock.id, {
            currentQuantity,
            totalAssetValue: toFloat(currentQuantity * latest.unitCost),
            batchCount: (lowDoc.batchCount ?? lowBatches.length) + 1,
          })
        }
      }
    }

    // ── 3. Safety-drain the out-of-stock product (fallback) ────────────
    // The tiny early batches should already be fully consumed; this only
    // fires if random dispatch draws somehow left stock behind.
    const outOfStock = productByName.get(OUT_OF_STOCK_PRODUCT_NAME)
    if (outOfStock) {
      const outBatches = await ctx.db
        .query("batches")
        .withIndex("by_product", (q) => q.eq("productId", outOfStock.id))
        .collect()
      const live = outBatches.filter(
        (b) => b.status === "active" && b.quantityRemaining > 0
      )
      const drained = live.reduce((sum, b) => sum + b.quantityRemaining, 0)
      if (drained > 0) {
        const target = live.reduce((a, b) =>
          a.quantityRemaining > b.quantityRemaining ? a : b
        )
        const adjDate = businessHourTimestamp(DATE_END.getTime())
        await ctx.db.insert("stockAdjustments", {
          batchId: target._id,
          productId: outOfStock.id,
          userId: ownerId,
          quantityAdjusted: target.quantityRemaining,
          reason: "recount",
          status: "applied",
          createdAt: adjDate,
        })
        await ctx.db.insert("auditLogs", {
          userId: ownerId,
          action: "stock_adjustment",
          description: JSON.stringify({
            summary: `Adjusted stock for ${OUT_OF_STOCK_PRODUCT_NAME} (deduct, recount)`,
            details: {
              productName: OUT_OF_STOCK_PRODUCT_NAME,
              quantityAdjusted: target.quantityRemaining,
              reason: "recount",
              direction: "deduct",
              batchCode: target.batchCode,
            },
            changes: {
              quantity_remaining: {
                old: target.quantityRemaining,
                new: 0,
              },
            },
          }),
          resourceType: "batch",
          resourceId: target._id,
          ipAddress: "127.0.0.1",
          userAgent: "Convex Seed",
          createdAt: adjDate,
        })
        auditLogCount++
        await ctx.db.patch(target._id, {
          quantityRemaining: 0,
          status: "depleted",
        })
        const outDoc = await ctx.db.get(outOfStock.id)
        if (outDoc) {
          const remaining = Math.max(0, outDoc.currentQuantity - drained)
          await ctx.db.patch(outOfStock.id, {
            currentQuantity: remaining,
            totalAssetValue:
              remaining === 0 ? 0 : toFloat(remaining * target.unitCost),
          })
        }
      }
    }

    return { auditLogCount }
  },
})

// ─── Internal Mutation: writeAuthLogs ──────────────────────────────────────

/**
 * Writes the auth sign-in / failed-sign-in audit logs. Internal — called by
 * `seedAll` at the end of the pipeline.
 */
type AuthLogAction = "auth_sign_in" | "auth_sign_in_failed"

export const writeAuthLogs = internalMutation({
  args: {
    ownerId: v.id("users"),
  },
  handler: async (ctx, { ownerId }) => {
    const authEvents: Array<Record<string, unknown>> = [
      {
        action: "auth_sign_in",
        email: process.env.STAFF_EMAIL,
        name: process.env.STAFF_NAME || "Staff",
        role: "staff",
      },
      {
        action: "auth_sign_in_failed",
        email: process.env.STAFF_EMAIL,
        reason: "invalid_credentials",
      },
    ]

    const ownerEmail = process.env.OWNER_EMAIL
    if (ownerEmail) {
      authEvents.push(
        {
          action: "auth_sign_in",
          email: ownerEmail,
          name: process.env.OWNER_NAME || "Owner",
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
          action: event.action as AuthLogAction,
          description: JSON.stringify(event),
          resourceType: "user",
          resourceId: ownerId,
          ipAddress: "127.0.0.1",
          userAgent: "Convex Seed",
          createdAt: logDate.getTime(),
        })
      })
    )

    return { auditLogCount: authEvents.length }
  },
})

// ─── Internal Mutation: writeTest ──────────────────────────────────────────

/**
 * Writes a test seed with real products plus edge case fixtures.
 * Includes: archived product, deactivated staff, depleted batch, voided batch,
 * voided adjustment, and realistic audit logs.
 * Internal mutation — called by `seedTest` action.
 */
export const writeTest = internalMutation({
  args: {
    ownerId: v.id("users"),
    staffId: v.id("users"),
    deactivatedStaffId: v.id("users"),
  },
  handler: async (ctx, { ownerId, staffId, deactivatedStaffId }) => {
    // ── 1. Insert suppliers (same 8 as seedAll) ─────────────────────
    const supplierIds = await Promise.all(
      SUPPLIER_DEFS.map((def) => ctx.db.insert("suppliers", def))
    )

    // ── 2. Insert products (15 real + 1 archived) ───────────────────
    const archivedProduct: ProductDef = {
      name: "Archived Sack 10kg",
      category: "sacks",
      baseUom: "piece",
      conversionFactor: SACKS_DEFAULT_PACK_SIZE,
      lowStockThreshold: 100,
    }
    const testProductDefs = [...PRODUCT_DEFS, archivedProduct]

    const productResults = await Promise.all(
      testProductDefs.map(async (def) => {
        const isArchived = def.name === "Archived Sack 10kg"
        const productCreatedAt = randDate(DATE_BASE, DATE_END)
        const id = await ctx.db.insert("products", {
          skuCode: nextSkuCode(),
          name: def.name,
          category: def.category,
          baseUom: def.baseUom,
          conversionFactor: def.conversionFactor,
          currentQuantity: 0,
          totalAssetValue: 0,
          lowStockThreshold: def.lowStockThreshold,
          status: isArchived ? "archived" : "active",
          imagePath: IMAGE_MAP[def.name],
          createdAt: productCreatedAt.getTime(),
          ...(def.keywords ? { keywords: def.keywords } : {}),
        })
        return { id, def }
      })
    )

    const productMap: Record<string, { id: Id<"products">; def: ProductDef }> =
      {}
    for (const { id, def } of productResults) {
      productMap[def.name] = { id, def }
    }
    const productList = Object.values(productMap)
    const activeProductList = productList.filter(
      (p) => p.def.name !== "Archived Sack 10kg"
    )

    // ── 3. Insert batches (~20, various states) ─────────────────────
    const userIds = [ownerId, staffId]
    const batchRecords: Array<{
      id: Id<"batches">
      productId: Id<"products">
      unitCost: number
      quantityReceived: number
      quantityRemaining: number
      baseUom: string
      batchCode: string
      createdDate: Date
      status: "active" | "depleted" | "voided"
    }> = []

    // Create 1-2 batches per active product
    for (const { id: pId, def } of activeProductList) {
      const numBatches = 2
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
            : def.baseUom === "roll"
              ? toFloat(rndInt(80, 200) + Math.random())
              : toFloat(rndInt(120, 280) + Math.random())

        const qty =
          def.baseUom === "piece"
            ? rndInt(100, 300)
            : def.baseUom === "roll"
              ? rndInt(20, 50)
              : toFloat(rndInt(80, 200) + Math.random())

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
          quantityReceived: qty,
          quantityRemaining: qty,
          baseUom: def.baseUom,
          batchCode,
          createdDate: batchDate,
          status: "active",
        })

        lastDate = batchDate
      }
    }

    // Add 1 depleted batch (Sack 50kg White, first batch)
    const sackProduct = productMap["Laminated Sack"]
    if (sackProduct) {
      const depletedBatchCode = nextBatchCode()
      const depletedBatchId = await ctx.db.insert("batches", {
        productId: sackProduct.id,
        supplierId: supplierIds[0],
        userId: ownerId,
        batchCode: depletedBatchCode,
        totalProcurementCost: toFloat(50 * 200),
        unitCost: 50,
        quantityReceived: 200,
        quantityRemaining: 0,
        status: "depleted",
        createdAt: DATE_BASE.getTime(),
      })
      batchRecords.push({
        id: depletedBatchId,
        productId: sackProduct.id,
        unitCost: 50,
        quantityReceived: 200,
        quantityRemaining: 0,
        baseUom: "piece",
        batchCode: depletedBatchCode,
        createdDate: DATE_BASE,
        status: "depleted",
      })
    }

    // Add 1 voided batch (Blue Twine)
    const twineProduct = productMap["Sewing Twine"]
    if (twineProduct) {
      const voidedBatchCode = nextBatchCode()
      const voidedBatchId = await ctx.db.insert("batches", {
        productId: twineProduct.id,
        supplierId: supplierIds[1],
        userId: staffId,
        batchCode: voidedBatchCode,
        totalProcurementCost: toFloat(150 * 100),
        unitCost: 150,
        quantityReceived: 100,
        quantityRemaining: 100,
        status: "voided",
        createdAt: DATE_BASE.getTime(),
      })
      batchRecords.push({
        id: voidedBatchId,
        productId: twineProduct.id,
        unitCost: 150,
        quantityReceived: 100,
        quantityRemaining: 100,
        baseUom: "meter",
        batchCode: voidedBatchCode,
        createdDate: DATE_BASE,
        status: "voided",
      })
    }

    // Denormalize per-product batch counts onto products
    const batchCountByProduct = new Map<Id<"products">, number>()
    for (const batch of batchRecords) {
      batchCountByProduct.set(
        batch.productId,
        (batchCountByProduct.get(batch.productId) ?? 0) + 1
      )
    }
    await Promise.all(
      [...batchCountByProduct.entries()].map(([pId, count]) =>
        ctx.db.patch(pId, { batchCount: count })
      )
    )

    // ── 4. Insert dispatches (~15) ───────────────────────────────
    const NUM_TEST_DISPATCHES = 15
    const dispatchRecords: Array<{
      id: Id<"dispatches">
      userId: Id<"users">
      createdDate: Date
    }> = []
    const dispatchItemsToInsert: Array<{
      dispatchId: Id<"dispatches">
      batchId: Id<"batches">
      productId: Id<"products">
      dispatchUom: "piece" | "roll" | "meter"
      dispatchQuantity: number
      quantityDeducted: number
      unitCost: number
      createdAt: number
    }> = []

    // Build product → active batches index
    const activeBatchesByProduct = new Map<
      Id<"products">,
      typeof batchRecords
    >()
    const depletedBatchIds = new Set<Id<"batches">>()
    for (const batch of batchRecords) {
      if (batch.status !== "active") {
        depletedBatchIds.add(batch.id)
        continue
      }
      let list = activeBatchesByProduct.get(batch.productId)
      if (!list) {
        list = []
        activeBatchesByProduct.set(batch.productId, list)
      }
      list.push(batch)
    }

    for (let i = 0; i < NUM_TEST_DISPATCHES; i++) {
      const dBase = randDate(DATE_BASE, DATE_END)
      const userId = rnd(userIds)
      const refs: Array<string | null> = [
        null,
        `PO-2025-${rndInt(1000, 9999)}`,
        `SO-${rndInt(100, 999)}`,
      ]
      const customerReference = rnd(refs)

      const dispatchId = await ctx.db.insert("dispatches", {
        userId,
        customerReference: customerReference ?? undefined,
        orNumber: await nextOrNumber(ctx, dBase.getTime()),
        createdAt: dBase.getTime(),
      })

      dispatchRecords.push({
        id: dispatchId,
        userId,
        createdDate: dBase,
      })

      // 1-3 items per dispatch
      const numItems = rndInt(1, 3)
      const usedProducts = new Set<Id<"products">>()

      for (let j = 0; j < numItems; j++) {
        const available = activeProductList.filter(
          (p) => !usedProducts.has(p.id)
        )
        if (available.length === 0) break

        const product = rnd(available)
        usedProducts.add(product.id)

        const baseUom = product.def.baseUom
        const dispatchQty =
          baseUom === "piece"
            ? rndInt(5, 30)
            : baseUom === "roll"
              ? rndInt(1, 5)
              : toFloat(rndInt(2, 20) + Math.random())

        const qtyDeducted =
          baseUom === "meter" ? toFloat(dispatchQty) : dispatchQty

        const productBatchesList = (
          activeBatchesByProduct.get(product.id) ?? []
        ).filter((b) => !depletedBatchIds.has(b.id))
        const candidateBatches = productBatchesList.filter(
          (b) => b.quantityRemaining >= qtyDeducted
        )

        if (candidateBatches.length === 0) continue

        const batch = candidateBatches.reduce((a, b) =>
          a.quantityRemaining > b.quantityRemaining ? a : b
        )

        const dispatchUom =
          product.def.baseUom === "piece"
            ? ("piece" as const)
            : product.def.baseUom === "roll"
              ? ("roll" as const)
              : ("meter" as const)

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
        batch.quantityRemaining =
          product.def.baseUom === "meter"
            ? toFloat(batch.quantityRemaining - qtyDeducted)
            : batch.quantityRemaining - qtyDeducted

        if (batch.quantityRemaining <= 0) {
          depletedBatchIds.add(batch.id)
        }
      }
    }

    // Post-process dispatches: remove empty ones, set itemCount, totalQuantity, totalValue and userName
    const itemCountMap = new Map<string, number>()
    const totalQuantityMap = new Map<string, number>()
    const totalValueMap = new Map<string, number>()
    for (const item of dispatchItemsToInsert) {
      itemCountMap.set(
        item.dispatchId,
        (itemCountMap.get(item.dispatchId) ?? 0) + 1
      )
      totalQuantityMap.set(
        item.dispatchId,
        (totalQuantityMap.get(item.dispatchId) ?? 0) + item.dispatchQuantity
      )
      totalValueMap.set(
        item.dispatchId,
        (totalValueMap.get(item.dispatchId) ?? 0) +
          item.quantityDeducted * item.unitCost
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
          totalQuantity: toFloat(totalQuantityMap.get(d.id) ?? 0),
          totalValue: toFloat(totalValueMap.get(d.id) ?? 0),
          userName: userNameMap[d.userId],
        })
      ),
    ])

    // Insert dispatch items
    await Promise.all(
      dispatchItemsToInsert.map((item) => ctx.db.insert("dispatchItems", item))
    )

    // Update batch quantities after dispatches
    for (const batch of batchRecords) {
      const remaining = Math.max(0, batch.quantityRemaining)
      if (remaining <= 0 && batch.status === "active") {
        batch.status = "depleted"
      }
      batch.quantityRemaining = remaining
    }
    await Promise.all(
      batchRecords.map((batch) => {
        const patch: Partial<Doc<"batches">> = {
          quantityRemaining: batch.quantityRemaining,
        }
        if (batch.status === "depleted") {
          patch.status = "depleted"
        }
        return ctx.db.patch(batch.id, patch)
      })
    )

    // ── 5. Insert stock adjustments (5 total, 1 voided) ─────────────
    const adjustmentRecords: Array<{
      id: Id<"stockAdjustments">
      batchId: Id<"batches">
      productId: Id<"products">
      quantity: number
      reason: "damaged" | "lost" | "recount" | "system_reversal"
    }> = []

    const reasons: Array<"damaged" | "lost" | "recount" | "system_reversal"> = [
      "recount",
      "damaged",
      "lost",
      "system_reversal",
    ]

    // Pick 5 active batches for adjustments
    const adjBatches = batchRecords
      .filter((b) => b.status === "active" && b.quantityRemaining > 10)
      .slice(0, 5)

    // Map for O(1) lookup — avoids `find` per iteration (react-doctor/js-index-maps)
    const productById = new Map(productList.map((p) => [p.id, p] as const))
    const adjustmentPlans: Array<{
      batchId: Id<"batches">
      productId: Id<"products">
      userId: Id<"users">
      quantity: number
      reason: "damaged" | "lost" | "recount" | "system_reversal"
      status: "applied" | "voided"
      createdAt: number
    }> = []
    for (let i = 0; i < adjBatches.length; i++) {
      const batch = adjBatches[i]
      const product = productById.get(batch.productId)
      if (!product) continue

      const baseUom = product.def.baseUom
      const qty =
        baseUom === "meter"
          ? toFloat(rndInt(1, 10) + Math.random())
          : rndInt(1, 10)

      const reason = reasons[i % reasons.length]
      const userId = rnd(userIds)
      const isVoided = i === adjBatches.length - 1 // Last one is voided
      const adjDate = randDate(DATE_BASE, DATE_END)

      adjustmentPlans.push({
        batchId: batch.id,
        productId: batch.productId,
        userId,
        quantity: qty,
        reason,
        status: isVoided ? "voided" : "applied",
        createdAt: adjDate.getTime(),
      })

      // Apply to batch if not voided
      if (!isVoided) {
        const newRemaining =
          product.def.baseUom === "meter"
            ? toFloat(batch.quantityRemaining - qty)
            : batch.quantityRemaining - qty
        batch.quantityRemaining = Math.max(0, newRemaining)
      }
    }

    // The plans above are fully specified, so only the inserts run
    // concurrently. `Promise.all` preserves order for `adjustmentRecords`.
    const adjustmentIds = await Promise.all(
      adjustmentPlans.map((plan) =>
        ctx.db.insert("stockAdjustments", {
          batchId: plan.batchId,
          productId: plan.productId,
          userId: plan.userId,
          quantityAdjusted: plan.quantity,
          reason: plan.reason,
          status: plan.status,
          createdAt: plan.createdAt,
        })
      )
    )
    adjustmentPlans.forEach((plan, index) => {
      adjustmentRecords.push({
        id: adjustmentIds[index],
        batchId: plan.batchId,
        productId: plan.productId,
        quantity: plan.quantity,
        reason: plan.reason,
      })
    })

    // Update batch quantities after adjustments
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

    // ── 6. Update product quantities from active batches ─────────────
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
          def.baseUom === "meter" ? toFloat(totalQty) : Math.round(totalQty)

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

    // ── 7. Insert audit logs (realistic, matching seeded actions) ────
    const productNameById: Record<string, string> = {}
    for (const { id, def } of productList) {
      productNameById[id] = def.name
    }

    // Stock-in logs for each batch
    await Promise.all(
      batchRecords.map(async (batch) => {
        const productName = productNameById[batch.productId] ?? "Unknown"
        return ctx.db.insert("auditLogs", {
          userId: ownerId,
          action: "stock_in",
          description: JSON.stringify({
            summary: `Stocked in ${toFloat(batch.quantityReceived)} units of ${productName} (${batch.batchCode})`,
            details: {
              product: productName,
              batchCode: batch.batchCode,
              quantity: toFloat(batch.quantityReceived),
              uom: batch.baseUom,
            },
          }),
          resourceType: "batch",
          resourceId: batch.id,
          ipAddress: "127.0.0.1",
          userAgent: "Seed Test",
          createdAt: batch.createdDate.getTime(),
        })
      })
    )

    // Dispatch logs
    const dispatchItemGroups: Record<string, typeof dispatchItemsToInsert> = {}
    for (const item of dispatchItemsToInsert) {
      const key = item.dispatchId
      if (!dispatchItemGroups[key]) dispatchItemGroups[key] = []
      dispatchItemGroups[key].push(item)
    }

    await Promise.all(
      nonEmptyDispatches.map(async (dispatch) => {
        const items = dispatchItemGroups[dispatch.id]
        if (!items || items.length === 0) return

        const products = items
          .map(
            (item) =>
              `${productNameById[item.productId] ?? "Unknown"} x ${item.dispatchQuantity} ${item.dispatchUom}`
          )
          .join("; ")

        return ctx.db.insert("auditLogs", {
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
          userAgent: "Seed Test",
          createdAt: dispatch.createdDate.getTime(),
        })
      })
    )

    // Adjustment logs
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
          userAgent: "Seed Test",
          createdAt: Date.now(),
        })
      })
    )

    // User management logs
    await Promise.all([
      ctx.db.insert("auditLogs", {
        userId: ownerId,
        action: "user_create",
        description: JSON.stringify({
          summary: `Created staff account for ${staffUser?.name ?? "Staff"}`,
          details: { email: staffUser?.email, role: "staff" },
        }),
        resourceType: "user",
        resourceId: staffId,
        ipAddress: "127.0.0.1",
        userAgent: "Seed Test",
        createdAt: DATE_BASE.getTime(),
      }),
      ctx.db.insert("auditLogs", {
        userId: ownerId,
        action: "user_deactivate",
        description: JSON.stringify({
          summary: `Deactivated staff account for ${userNameMap[deactivatedStaffId] ?? "Deactivated Staff"}`,
          details: { email: "deactivated@test.com", role: "staff" },
        }),
        resourceType: "user",
        resourceId: deactivatedStaffId,
        ipAddress: "127.0.0.1",
        userAgent: "Seed Test",
        createdAt: DATE_BASE.getTime() + 1000,
      }),
    ])

    // Auth event logs
    const authEvents = [
      {
        action: "auth_sign_in",
        email: process.env.STAFF_EMAIL,
        name: process.env.STAFF_NAME || "Staff",
        role: "staff",
      },
      {
        action: "auth_sign_in_failed",
        email: process.env.STAFF_EMAIL,
        reason: "invalid_credentials",
      },
    ]

    const ownerEmail = process.env.OWNER_EMAIL
    if (ownerEmail) {
      authEvents.push(
        {
          action: "auth_sign_in",
          email: ownerEmail,
          name: process.env.OWNER_NAME || "Owner",
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
          userAgent: "Seed Test",
          createdAt: logDate.getTime(),
        })
      })
    )

    // ── Return summary ───────────────────────────────────────────────
    return {
      supplierCount: supplierIds.length,
      productCount: productList.length,
      batchCount: batchRecords.length,
      dispatchCount: nonEmptyDispatches.length,
      dispatchItemCount: dispatchItemsToInsert.length,
      adjustmentCount: adjustmentRecords.length,
      auditLogCount: (await ctx.db.query("auditLogs").collect()).length,
    }
  },
})

// ─── Clear & status (chunked — each call stays within limit budgets) ─────

const CLEARABLE_TABLES = [
  "auditLogs",
  "batches",
  "dispatchItems",
  "dispatches",
  "products",
  "stockAdjustments",
  "suppliers",
] as const

/**
 * Deletes up to `limit` rows from a table in one execution budget. The seed
 * actions loop this until a call returns fewer rows than the limit, so clear
 * and re-seed runs never blow Convex's read/write limits — even on a flooded
 * database. Returns the number of rows deleted.
 */
export const clearTableChunk = internalMutation({
  args: {
    table: v.union(
      v.literal("auditLogs"),
      v.literal("batches"),
      v.literal("dispatchItems"),
      v.literal("dispatches"),
      v.literal("products"),
      v.literal("stockAdjustments"),
      v.literal("suppliers")
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { table, limit }) => {
    const take = limit ?? CLEAR_CHUNK_LIMIT
    const docs = await ctx.db.query(table).take(take)
    await Promise.all(docs.map((d) => ctx.db.delete(d._id)))
    return { deleted: docs.length }
  },
})

/**
 * Reports how many rows remain per table so the seed actions know when the
 * chunked clear has finished. Reads a single page per table.
 */
export const seedStatus = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Each single-row status read is independent, so overlap them.
    const remaining = await Promise.all(
      CLEARABLE_TABLES.map(async (table) => {
        const docs = await ctx.db.query(table).take(1)
        return [table, docs.length] as const
      })
    )
    return Object.fromEntries(remaining)
  },
})

/**
 * Maps every user id to its display name, used to denormalize `userName` on
 * seeded dispatches. The users table is tiny, so a full collect is safe here.
 */
export const getUserNames = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect()
    const names: Record<string, string> = {}
    for (const user of users) names[user._id] = user.name ?? ""
    return names
  },
})
