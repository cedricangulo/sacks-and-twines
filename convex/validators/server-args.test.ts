import { describe, expect, it } from "vitest"
import { z } from "zod"
import {
  stockInArgs,
  updateBatchArgs,
  voidBatchArgs,
} from "../batches/validators"
import { submitDispatchArgs } from "../dispatches/validators"
import { createProductArgs } from "../products/validators"
import { createStockAdjustmentArgs } from "../stock_adjustments/validators"
import { createSupplierArgs } from "../suppliers/validators"
import { createUserArgs } from "../users/validators"
import { MAX_COST, MAX_FACTOR, MAX_QUANTITY, NUMERIC_MESSAGES } from "./helpers"

/**
 * Schema-level tests for the server-side argument validators.
 *
 * These exist because the mutation suites do not cover them. Before this file
 * the entire suite had seven schema-rejection tests, all of them minimum-length
 * or format checks (`suppliers` x3, `users` x3, `dispatches.items.min(1)`).
 * Not one exercised an allowlist, a `max` bound, a wrong type or a numeric
 * `min`. Deleting the `.refine((v) => allowed.test(v))` from `safeText` left
 * CI green.
 *
 * No `convexTest`, no auth mocks, no rate limiter: these are plain zod schemas,
 * so wrapping each exported arg object is enough. (`convex/<table>/validators.ts`
 * export an object of schemas for `zMutation`'s `args`, not a `z.object`.)
 *
 * `zid()` is a runtime no-op that accepts any non-empty string, which is why
 * no real document IDs are needed here.
 */
const stockIn = z.object(stockInArgs)
const batchUpdate = z.object(updateBatchArgs)
const voidBatch = z.object(voidBatchArgs)
const dispatchSubmit = z.object(submitDispatchArgs)
const productCreate = z.object(createProductArgs)
const supplierCreate = z.object(createSupplierArgs)
const userCreate = z.object(createUserArgs)
const adjustmentCreate = z.object(createStockAdjustmentArgs)

// A minimal valid payload per schema, used as the base for single-field
// mutations in each block below.
const validStockIn = {
  mode: "existing" as const,
  productId: "prod_1",
  supplierId: "sup_1",
  quantityReceived: 100,
  totalProcurementCost: 5000,
}
const validDispatch = {
  items: [{ productId: "prod_1", quantity: 5, dispatchUom: "piece" as const }],
}
const validProduct = {
  name: "Twist Twine",
  category: "twines" as const,
  baseUom: "meter" as const,
}
const validSupplier = {
  companyName: "Acme Trading",
  contactPerson: "Juan Dela Cruz",
  contactNumber: "09171234567",
  address: "123 Mabini Street, Quezon City",
}
const validUser = {
  name: "Juan Dela Cruz",
  email: "juan@example.com",
  password: "password123",
}

// Payloads that must never reach the database.
const XSS = "<script>alert(1)</script>"
const TAG = "<b>tag</b>"
const CSV_FORMULA = "=cmd|'/c calc'!A0"

/** Asserts the schema rejects the value and that it is the named field at fault. */
function expectFieldRejected(
  result: z.ZodSafeParseResult<unknown>,
  field: string
) {
  expect(result.success).toBe(false)
  if (result.success) return
  expect(result.error.issues.map((i) => i.path.join("."))).toContain(field)
}

/** Asserts the named field is rejected with the exact user-facing message. */
function expectFieldMessage(
  result: z.ZodSafeParseResult<unknown>,
  field: string,
  message: string
) {
  expect(result.success).toBe(false)
  if (result.success) return
  const issue = result.error.issues.find((i) => i.path.join(".") === field)
  expect(issue?.message).toBe(message)
}

describe("allowlist wiring — server arg schemas", () => {
  it("rejects markup in product name", () => {
    expectFieldRejected(
      productCreate.safeParse({ ...validProduct, name: XSS }),
      "name"
    )
    expectFieldRejected(
      productCreate.safeParse({ ...validProduct, name: TAG }),
      "name"
    )
  })

  it("rejects markup in stock-in product name", () => {
    expectFieldRejected(
      stockIn.safeParse({ ...validStockIn, mode: "new", name: XSS }),
      "name"
    )
  })

  it("rejects markup in supplier company name and contact person", () => {
    expectFieldRejected(
      supplierCreate.safeParse({ ...validSupplier, companyName: XSS }),
      "companyName"
    )
    expectFieldRejected(
      supplierCreate.safeParse({ ...validSupplier, contactPerson: TAG }),
      "contactPerson"
    )
  })

  it("rejects markup in staff name", () => {
    expectFieldRejected(
      userCreate.safeParse({ ...validUser, name: XSS }),
      "name"
    )
  })

  it("rejects the CSV formula prefix in a void reason", () => {
    // A leading `=` is a formula-injection vector wherever this field is later
    // exported to CSV.
    expectFieldRejected(
      voidBatch.safeParse({ batchId: "b_1", reason: CSV_FORMULA }),
      "reason"
    )
    expectFieldRejected(
      voidBatch.safeParse({ batchId: "b_1", reason: "=1+1" }),
      "reason"
    )
  })

  it("rejects markup in a void reason", () => {
    expectFieldRejected(
      voidBatch.safeParse({ batchId: "b_1", reason: TAG }),
      "reason"
    )
  })

  it("rejects the CSV formula prefix and markup in a customer reference", () => {
    expectFieldRejected(
      dispatchSubmit.safeParse({
        ...validDispatch,
        customerReference: CSV_FORMULA,
      }),
      "customerReference"
    )
    expectFieldRejected(
      dispatchSubmit.safeParse({
        ...validDispatch,
        customerReference: "<b>Acme</b>",
      }),
      "customerReference"
    )
  })

  it("accepts realistic punctuation that operators actually type", () => {
    // The counterpart to the rejections above. These are the values that broke
    // when the allowlist was too strict.
    const names = ["Acme Trading, Inc.", "Juan's Shop", "Dela Cruz & Sons"]
    for (const name of names) {
      expect(productCreate.safeParse({ ...validProduct, name }).success).toBe(
        true
      )
    }
    expect(
      voidBatch.safeParse({ batchId: "b_1", reason: "Value ₱5,000 — damaged" })
        .success
    ).toBe(true)
    expect(
      dispatchSubmit.safeParse({
        ...validDispatch,
        customerReference: "Acme Trading, Inc.",
      }).success
    ).toBe(true)
  })
})

describe("length bounds — server arg schemas", () => {
  it("enforces the product name maximum", () => {
    expect(
      productCreate.safeParse({ ...validProduct, name: "x".repeat(255) })
        .success
    ).toBe(true)
    expectFieldRejected(
      productCreate.safeParse({ ...validProduct, name: "x".repeat(256) }),
      "name"
    )
  })

  it("enforces the void reason maximum", () => {
    const base = { batchId: "b_1" }
    expect(
      voidBatch.safeParse({ ...base, reason: "x".repeat(500) }).success
    ).toBe(true)
    expectFieldRejected(
      voidBatch.safeParse({ ...base, reason: "x".repeat(501) }),
      "reason"
    )
  })

  it("enforces the customer reference maximum", () => {
    // Matches `CUSTOMER_REFERENCE_MAX`, shared with the client form — both
    // sides reject the same length.
    expect(
      dispatchSubmit.safeParse({
        ...validDispatch,
        customerReference: "x".repeat(50),
      }).success
    ).toBe(true)
    expectFieldRejected(
      dispatchSubmit.safeParse({
        ...validDispatch,
        customerReference: "x".repeat(51),
      }),
      "customerReference"
    )
  })

  it("enforces the supplier and staff name maxima", () => {
    expectFieldRejected(
      supplierCreate.safeParse({
        ...validSupplier,
        companyName: "x".repeat(256),
      }),
      "companyName"
    )
    expectFieldRejected(
      userCreate.safeParse({ ...validUser, name: "x".repeat(256) }),
      "name"
    )
  })

  it("enforces the password maximum that bounds scrypt cost", () => {
    // `.max` is a DoS guard, not a formatting rule: scrypt is deliberately slow.
    expect(
      userCreate.safeParse({ ...validUser, password: "x".repeat(128) }).success
    ).toBe(true)
    expectFieldRejected(
      userCreate.safeParse({ ...validUser, password: "x".repeat(129) }),
      "password"
    )
  })
})

describe("wrong types — server arg schemas", () => {
  it("rejects a string where a number is required", () => {
    expectFieldRejected(
      stockIn.safeParse({ ...validStockIn, quantityReceived: "100" }),
      "quantityReceived"
    )
    expectFieldRejected(
      stockIn.safeParse({ ...validStockIn, totalProcurementCost: "5000" }),
      "totalProcurementCost"
    )
    expectFieldRejected(
      dispatchSubmit.safeParse({
        ...validDispatch,
        items: [{ productId: "p_1", quantity: "5", dispatchUom: "piece" }],
      }),
      "items.0.quantity"
    )
  })

  it("explains wrong numeric types in plain language", () => {
    expectFieldMessage(
      stockIn.safeParse({ ...validStockIn, quantityReceived: "100" }),
      "quantityReceived",
      NUMERIC_MESSAGES.invalidNumber
    )
    expectFieldMessage(
      productCreate.safeParse({ ...validProduct, conversionFactor: "2" }),
      "conversionFactor",
      NUMERIC_MESSAGES.invalidNumber
    )
  })

  it("rejects an unknown enum value", () => {
    expectFieldRejected(
      stockIn.safeParse({ ...validStockIn, mode: "bogus" }),
      "mode"
    )
    expectFieldRejected(
      adjustmentCreate.safeParse({
        batchId: "b_1",
        productId: "p_1",
        direction: "sideways",
        quantity: 1,
        reason: "damaged",
      }),
      "direction"
    )
    expectFieldRejected(
      adjustmentCreate.safeParse({
        batchId: "b_1",
        productId: "p_1",
        direction: "add",
        quantity: 1,
        reason: "exploded",
      }),
      "reason"
    )
  })

  it("rejects a missing required field", () => {
    // `supplierId` is non-optional. Note the contrast with `productId`, which is
    // `z.optional(zid(...))` even in `mode: "existing"` — that coupling is
    // enforced by the handler, not by the schema, so it is not asserted here.
    expectFieldRejected(
      stockIn.safeParse({
        mode: "existing",
        productId: "prod_1",
        quantityReceived: 1,
        totalProcurementCost: 1,
      }),
      "supplierId"
    )
  })

  it("accepts a stock-in payload with no productId at the schema layer", () => {
    // Documents the drift rather than asserting it is correct: the schema cannot
    // tell you a `mode: "existing"` payload is missing its product.
    const result = stockIn.safeParse({
      mode: "existing",
      supplierId: "sup_1",
      quantityReceived: 1,
      totalProcurementCost: 1,
    })
    expect(result.success).toBe(true)
  })
})

describe("numeric bounds — server arg schemas", () => {
  it("rejects zero and negative quantities", () => {
    expectFieldRejected(
      stockIn.safeParse({ ...validStockIn, quantityReceived: 0 }),
      "quantityReceived"
    )
    expectFieldRejected(
      stockIn.safeParse({ ...validStockIn, quantityReceived: -5 }),
      "quantityReceived"
    )
    expectFieldRejected(
      batchUpdate.safeParse({
        batchId: "b_1",
        productId: "p_1",
        supplierId: "s_1",
        quantityReceived: 0,
        totalProcurementCost: 1,
      }),
      "quantityReceived"
    )
  })

  it("rejects a negative conversion factor and threshold", () => {
    expectFieldRejected(
      stockIn.safeParse({ ...validStockIn, conversionFactor: -1 }),
      "conversionFactor"
    )
    expectFieldRejected(
      productCreate.safeParse({ ...validProduct, lowStockThreshold: -1 }),
      "lowStockThreshold"
    )
  })

  it("rejects Infinity, which satisfies a bare .min(0)", () => {
    // `.finite()` is present on every numeric schema for defence in depth, but
    // note that zod 4.4.3's base number type already rejects non-finite values —
    // this asserts the outcome rather than which check produced it, so the test
    // still holds if the guard is ever consolidated upstream.
    const inf = Number.POSITIVE_INFINITY
    expectFieldRejected(
      stockIn.safeParse({ ...validStockIn, quantityReceived: inf }),
      "quantityReceived"
    )
    expectFieldRejected(
      stockIn.safeParse({ ...validStockIn, totalProcurementCost: inf }),
      "totalProcurementCost"
    )
    expectFieldRejected(
      stockIn.safeParse({ ...validStockIn, conversionFactor: inf }),
      "conversionFactor"
    )
    expectFieldRejected(
      dispatchSubmit.safeParse({
        ...validDispatch,
        items: [{ productId: "p_1", quantity: inf, dispatchUom: "piece" }],
      }),
      "items.0.quantity"
    )
    expectFieldRejected(
      adjustmentCreate.safeParse({
        batchId: "b_1",
        productId: "p_1",
        direction: "add",
        quantity: inf,
        reason: "damaged",
      }),
      "quantity"
    )
  })
})

describe("optionalSafeText at the void reason call site", () => {
  // Regression guards for the bug fixed in this change set. The textarea is
  // optional and a controlled input initializes to "", so `z.optional` admits
  // `undefined` but not `""` — which made an explicitly optional field fail its
  // own `.min(1)` and block every submit.
  const base = { batchId: "b_1" }

  it("treats an empty string as not provided", () => {
    const result = voidBatch.safeParse({ ...base, reason: "" })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.reason).toBeUndefined()
  })

  it("treats a whitespace-only string as not provided", () => {
    const result = voidBatch.safeParse({ ...base, reason: "   " })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.reason).toBeUndefined()
  })

  it("accepts a missing reason", () => {
    const result = voidBatch.safeParse(base)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.reason).toBeUndefined()
  })

  it("still normalizes and keeps a real reason", () => {
    const result = voidBatch.safeParse({
      ...base,
      reason: "  Damaged\ngoods  ",
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.reason).toBe("Damaged goods")
  })
})

describe("optionalSafeText at the customer reference call site", () => {
  it("treats an empty string as not provided", () => {
    const result = dispatchSubmit.safeParse({
      ...validDispatch,
      customerReference: "",
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.customerReference).toBeUndefined()
  })

  it("treats a whitespace-only string as not provided", () => {
    const result = dispatchSubmit.safeParse({
      ...validDispatch,
      customerReference: "   ",
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.customerReference).toBeUndefined()
  })

  it("accepts a missing reference", () => {
    const result = dispatchSubmit.safeParse(validDispatch)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.customerReference).toBeUndefined()
  })
})

describe("keyword normalization parity", () => {
  it("tolerates blank entries so normalizeKeywords can drop them", () => {
    // Not trimmed before `.min(1)`: "  " is two characters, so it passes here
    // and is dropped when the mutation stores the product.
    const result = productCreate.safeParse({
      ...validProduct,
      keywords: ["Straw", "  Hay ", "  "],
    })
    expect(result.success).toBe(true)
  })

  it("rejects a keyword over the character cap", () => {
    expectFieldRejected(
      productCreate.safeParse({ ...validProduct, keywords: ["x".repeat(21)] }),
      "keywords.0"
    )
  })
})

describe("supplier address stays free text", () => {
  // `address` deliberately uses `normalizedString`, not `safeText`: an allowlist
  // there would reject ordinary street and unit punctuation.
  it("accepts unit and street punctuation", () => {
    const result = supplierCreate.safeParse({
      ...validSupplier,
      address: "Unit 4-B, 123 Mabini St., Quezon City",
    })
    expect(result.success).toBe(true)
  })
})

describe("upper bounds — server arg schemas", () => {
  // Regression guard. `1e95` is finite and comfortably above `.min(0.01)`, so
  // with no ceiling it was accepted as a quantity and as a peso cost. One such
  // value poisons `totalAssetValue` (quantity * unitCost) permanently.
  const HUGE = 1e95

  it("rejects an enormous quantity", () => {
    expectFieldRejected(
      stockIn.safeParse({ ...validStockIn, quantityReceived: HUGE }),
      "quantityReceived"
    )
    expectFieldRejected(
      batchUpdate.safeParse({
        batchId: "b_1",
        productId: "p_1",
        supplierId: "s_1",
        quantityReceived: HUGE,
        totalProcurementCost: 1,
      }),
      "quantityReceived"
    )
    expectFieldRejected(
      dispatchSubmit.safeParse({
        ...validDispatch,
        items: [{ productId: "p_1", quantity: HUGE, dispatchUom: "piece" }],
      }),
      "items.0.quantity"
    )
    expectFieldRejected(
      adjustmentCreate.safeParse({
        batchId: "b_1",
        productId: "p_1",
        direction: "add",
        quantity: HUGE,
        reason: "damaged",
      }),
      "quantity"
    )
  })

  it("rejects an enormous cost", () => {
    expectFieldRejected(
      stockIn.safeParse({ ...validStockIn, totalProcurementCost: HUGE }),
      "totalProcurementCost"
    )
  })

  it("rejects an enormous conversion factor and threshold", () => {
    expectFieldRejected(
      stockIn.safeParse({ ...validStockIn, conversionFactor: HUGE }),
      "conversionFactor"
    )
    expectFieldRejected(
      productCreate.safeParse({ ...validProduct, lowStockThreshold: HUGE }),
      "lowStockThreshold"
    )
    expectFieldRejected(
      productCreate.safeParse({ ...validProduct, conversionFactor: HUGE }),
      "conversionFactor"
    )
  })

  it("still accepts real-world magnitudes", () => {
    // History tops out around 4,500 units and ~₱562,258. The chosen ceilings
    // retain more than 17× headroom above those values — restrictive enough to
    // catch an exponent typo, but not business limits that could block
    // legitimate growth.
    expect(
      stockIn.safeParse({
        ...validStockIn,
        quantityReceived: 4500,
        totalProcurementCost: 560000,
      }).success
    ).toBe(true)
    expect(
      productCreate.safeParse({ ...validProduct, lowStockThreshold: 100 })
        .success
    ).toBe(true)
  })
})

describe("ceiling boundaries — deliberately chosen values", () => {
  // These pin the exact business ceilings. If the constants change, these tests
  // change too, rather than silently permitting a widened range.
  it("accepts the exact ceiling and rejects one unit above it", () => {
    expect(
      stockIn.safeParse({
        ...validStockIn,
        quantityReceived: MAX_QUANTITY,
      }).success
    ).toBe(true)
    expectFieldRejected(
      stockIn.safeParse({
        ...validStockIn,
        quantityReceived: MAX_QUANTITY + 1,
      }),
      "quantityReceived"
    )

    expect(
      stockIn.safeParse({
        ...validStockIn,
        totalProcurementCost: MAX_COST,
      }).success
    ).toBe(true)
    expectFieldRejected(
      stockIn.safeParse({
        ...validStockIn,
        totalProcurementCost: MAX_COST + 1,
      }),
      "totalProcurementCost"
    )

    expect(
      productCreate.safeParse({
        ...validProduct,
        conversionFactor: MAX_FACTOR,
      }).success
    ).toBe(true)
    expectFieldRejected(
      productCreate.safeParse({
        ...validProduct,
        conversionFactor: MAX_FACTOR + 1,
      }),
      "conversionFactor"
    )

    expect(
      productCreate.safeParse({
        ...validProduct,
        lowStockThreshold: MAX_QUANTITY,
      }).success
    ).toBe(true)
    expectFieldRejected(
      productCreate.safeParse({
        ...validProduct,
        lowStockThreshold: MAX_QUANTITY + 1,
      }),
      "lowStockThreshold"
    )
  })

  it("explains ceiling violations with the permitted maximum", () => {
    expectFieldMessage(
      stockIn.safeParse({
        ...validStockIn,
        quantityReceived: MAX_QUANTITY + 1,
      }),
      "quantityReceived",
      NUMERIC_MESSAGES.quantityTooLarge
    )
    expectFieldMessage(
      stockIn.safeParse({
        ...validStockIn,
        totalProcurementCost: MAX_COST + 1,
      }),
      "totalProcurementCost",
      NUMERIC_MESSAGES.amountTooLarge
    )
    expectFieldMessage(
      productCreate.safeParse({
        ...validProduct,
        conversionFactor: MAX_FACTOR + 1,
      }),
      "conversionFactor",
      NUMERIC_MESSAGES.factorTooLarge
    )
  })
})
