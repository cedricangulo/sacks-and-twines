import { describe, expect, it } from "vitest"
import { validateStockAdjustment } from "./validation"

const base = {
  direction: "add" as const,
  quantity: 5,
  reason: "recount" as const,
}

describe("validateStockAdjustment", () => {
  it("accepts a valid adjustment", () => {
    expect(validateStockAdjustment(base).success).toBe(true)
  })

  it("rejects a zero quantity", () => {
    expect(validateStockAdjustment({ ...base, quantity: 0 }).success).toBe(
      false
    )
  })

  it("shows the whole-number message for a zero whole-unit quantity", () => {
    const result = validateStockAdjustment(
      { ...base, quantity: 0 },
      { allowDecimal: false }
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.quantity).toBe("Quantity must be a whole number.")
    }
  })

  it("rejects an infinite quantity", () => {
    expect(
      validateStockAdjustment({ ...base, quantity: Infinity }).success
    ).toBe(false)
  })

  it("rejects an unknown reason", () => {
    expect(
      validateStockAdjustment({
        ...base,
        reason: "whatever" as unknown as "recount",
      }).success
    ).toBe(false)
  })

  it("requires a reason", () => {
    expect(
      validateStockAdjustment({
        ...base,
        reason: "" as unknown as "recount",
      }).success
    ).toBe(false)
  })

  it("allows a fractional quantity when decimals are permitted", () => {
    expect(
      validateStockAdjustment(
        { ...base, quantity: 2.5 },
        { allowDecimal: true }
      ).success
    ).toBe(true)
  })

  it("rejects a fractional quantity for whole-unit products", () => {
    expect(
      validateStockAdjustment(
        { ...base, quantity: 2.5 },
        { allowDecimal: false }
      ).success
    ).toBe(false)
  })

  it("accepts a whole quantity for whole-unit products", () => {
    expect(
      validateStockAdjustment({ ...base, quantity: 3 }, { allowDecimal: false })
        .success
    ).toBe(true)
  })
})
