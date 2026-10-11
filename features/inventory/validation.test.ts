import { describe, expect, it } from "vitest"
import {
  validateBatchUpdate,
  validateStockIn,
  validateVoidBatch,
} from "./validation"

describe("validateStockIn", () => {
  const base = {
    mode: "existing" as const,
    supplierId: "sup1",
    quantityReceived: 10,
    totalProcurementCost: 500,
  }

  it("accepts a valid stock-in", () => {
    expect(validateStockIn(base).success).toBe(true)
  })

  it("rejects a quantity of zero", () => {
    expect(validateStockIn({ ...base, quantityReceived: 0 }).success).toBe(
      false
    )
  })

  it("rejects Infinity, which satisfies a bare .min(0.01)", () => {
    // Number("1e999") === Infinity
    expect(
      validateStockIn({ ...base, quantityReceived: Infinity }).success
    ).toBe(false)
    expect(
      validateStockIn({ ...base, totalProcurementCost: Infinity }).success
    ).toBe(false)
  })

  it("rejects NaN", () => {
    expect(
      validateStockIn({ ...base, quantityReceived: Number.NaN }).success
    ).toBe(false)
  })

  it("requires a supplier", () => {
    const result = validateStockIn({ ...base, supplierId: "" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.supplierId).toBeDefined()
    }
  })

  it("rejects a whitespace-only new-product name", () => {
    // The hook trims before parsing, so "" reaches the schema and fails
    // productNameField rather than being dropped via `|| undefined`.
    const result = validateStockIn({ ...base, mode: "new", name: "" })
    expect(result.success).toBe(false)
  })

  it("rejects disallowed characters in a new-product name", () => {
    const result = validateStockIn({
      ...base,
      mode: "new",
      name: "<b>Sacks</b>",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.name).toBeDefined()
    }
  })

  it("normalizes a valid new-product name", () => {
    const result = validateStockIn({
      ...base,
      mode: "new",
      name: "  Polypropylene  Sack  ",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("Polypropylene Sack")
    }
  })

  it("caps the keywords array", () => {
    const many = Array.from({ length: 13 }, (_, i) => `kw${i}`)
    const result = validateStockIn({ ...base, keywords: many })
    expect(result.success).toBe(false)
  })

  it("caps each keyword at 20 characters", () => {
    const result = validateStockIn({ ...base, keywords: ["x".repeat(21)] })
    expect(result.success).toBe(false)
  })
})

describe("validateBatchUpdate", () => {
  const base = {
    supplierId: "sup1",
    quantityReceived: 5,
    totalProcurementCost: 250,
  }

  it("accepts a valid update", () => {
    expect(validateBatchUpdate(base).success).toBe(true)
  })

  it("rejects Infinity amounts", () => {
    expect(
      validateBatchUpdate({ ...base, quantityReceived: Infinity }).success
    ).toBe(false)
  })
})

describe("validateVoidBatch", () => {
  it("accepts an omitted reason", () => {
    const result = validateVoidBatch({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.reason).toBeUndefined()
    }
  })

  it("treats an empty-string reason as omitted, not invalid", () => {
    // Regression guard. The textarea is optional and its state initializes to
    // "", so a plain `z.optional` schema would fail its own `.min(1)` and
    // block the submit when the field is left blank.
    const result = validateVoidBatch({ reason: "" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.reason).toBeUndefined()
    }
  })

  it("treats a whitespace-only reason as not provided", () => {
    // The field is labelled "Optional", so a blank entry of any flavour means
    // "no reason". Before this the old call site sent "   " verbatim to the
    // mutation, storing whitespace in the audit trail.
    const result = validateVoidBatch({ reason: "   " })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.reason).toBeUndefined()
    }
  })

  it("preserves word boundaries across a newline", () => {
    // A multi-line void reason must not have its newline deleted, which would
    // run the two lines together ("Damagedgoods").
    const result = validateVoidBatch({ reason: "Damaged\ngoods, wrong item" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.reason).toBe("Damaged goods, wrong item")
    }
  })

  it("accepts a peso amount and arithmetic in the reason", () => {
    expect(
      validateVoidBatch({ reason: "Value ₱5,000 — supplier short" }).success
    ).toBe(true)
    expect(
      validateVoidBatch({ reason: "Damaged + water soaked" }).success
    ).toBe(true)
  })

  it("accepts an ordinary narrative reason", () => {
    expect(
      validateVoidBatch({ reason: "Damaged goods, wrong delivery" }).success
    ).toBe(true)
  })

  it("normalizes a whitespace-only reason to not-provided", () => {
    const result = validateVoidBatch({ reason: "     " })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.reason).toBeUndefined()
    }
  })

  it("rejects a reason over 500 characters", () => {
    expect(validateVoidBatch({ reason: "x".repeat(501) }).success).toBe(false)
  })

  it("accepts exactly 500 characters", () => {
    expect(validateVoidBatch({ reason: "x".repeat(500) }).success).toBe(true)
  })

  it("normalizes whitespace in the reason", () => {
    const result = validateVoidBatch({ reason: "  damaged   goods  " })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.reason).toBe("damaged goods")
    }
  })
})
