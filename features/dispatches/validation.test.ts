import { describe, expect, it } from "vitest"
import { validateDispatchSubmit } from "./validation"

const base = {
  items: [{ productId: "p1", quantity: 5, dispatchUom: "piece" as const }],
}

describe("validateDispatchSubmit", () => {
  it("accepts a valid dispatch", () => {
    expect(validateDispatchSubmit(base).success).toBe(true)
  })

  it("accepts an omitted customer reference", () => {
    const result = validateDispatchSubmit(base)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.customerReference).toBeUndefined()
    }
  })

  it("treats an empty-string reference as omitted, not invalid", () => {
    // Regression guard. The input is optional and its state initializes to "",
    // so a plain `z.optional` schema would fail its own `.min(1)` and block
    // every submit with no reference entered.
    const result = validateDispatchSubmit({ ...base, customerReference: "" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.customerReference).toBeUndefined()
    }
  })

  it.each([
    "Acme Trading, Inc.",
    "Juan's Shop",
    "Dela Cruz & Sons",
    "ABC-1234",
    "Plate #42",
    "Rider 7/B",
  ])("accepts a realistic reference %j", (reference) => {
    expect(
      validateDispatchSubmit({ ...base, customerReference: reference }).success
    ).toBe(true)
  })

  it("rejects an empty item list", () => {
    const result = validateDispatchSubmit({ ...base, items: [] })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.items).toBeDefined()
    }
  })

  it("rejects a customer reference containing '=', a CSV formula vector", () => {
    const result = validateDispatchSubmit({
      ...base,
      customerReference: "=cmd|'/c calc'!A0",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.customerReference).toBeDefined()
    }
  })

  it("accepts a plate number with a hyphen", () => {
    expect(
      validateDispatchSubmit({ ...base, customerReference: "ABC-1234" }).success
    ).toBe(true)
  })

  it("accepts a Filipino personal name as a reference", () => {
    expect(
      validateDispatchSubmit({ ...base, customerReference: "Juan Dela Cruz" })
        .success
    ).toBe(true)
  })

  it("rejects a reference over 255 characters", () => {
    expect(
      validateDispatchSubmit({ ...base, customerReference: "x".repeat(256) })
        .success
    ).toBe(false)
  })

  it("normalizes the reference rather than storing it raw", () => {
    const result = validateDispatchSubmit({
      ...base,
      customerReference: "  ABC-1234  ",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.customerReference).toBe("ABC-1234")
    }
  })

  it("rejects a zero quantity", () => {
    const result = validateDispatchSubmit({
      items: [{ productId: "p1", quantity: 0, dispatchUom: "piece" }],
    })
    expect(result.success).toBe(false)
    // Nested issues key by their full dotted path.
    if (!result.success) {
      expect(result.errors["items.0.quantity"]).toBeDefined()
    }
  })

  it("rejects an infinite quantity", () => {
    expect(
      validateDispatchSubmit({
        items: [{ productId: "p1", quantity: Infinity, dispatchUom: "piece" }],
      }).success
    ).toBe(false)
  })

  it("rejects an unknown dispatch unit", () => {
    expect(
      validateDispatchSubmit({
        items: [
          {
            productId: "p1",
            quantity: 1,
            dispatchUom: "gallon" as unknown as "piece",
          },
        ],
      }).success
    ).toBe(false)
  })
})
