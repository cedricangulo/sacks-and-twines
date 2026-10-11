import { describe, expect, it } from "vitest"
import { validateProductUpdate } from "./validation"

describe("validateProductUpdate", () => {
  const base = {
    name: "Polypropylene Sack",
    category: "sacks" as const,
    baseUom: "piece" as const,
  }

  it("accepts a valid update", () => {
    expect(validateProductUpdate(base).success).toBe(true)
  })

  it("rejects a whitespace-only name", () => {
    // Previously `z.string().min(1)` accepted "   "; the server then rejected it.
    const result = validateProductUpdate({ ...base, name: "   " })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.name).toBeDefined()
    }
  })

  it("rejects markup rather than stripping it", () => {
    expect(
      validateProductUpdate({ ...base, name: "<b>Sack</b>" }).success
    ).toBe(false)
  })

  it("normalizes the name", () => {
    const result = validateProductUpdate({ ...base, name: "  Sack   50kg " })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("Sack 50kg")
    }
  })

  it("rejects a name over 255 characters", () => {
    expect(
      validateProductUpdate({ ...base, name: "x".repeat(256) }).success
    ).toBe(false)
  })

  it("accepts an accented or apostrophized name", () => {
    expect(
      validateProductUpdate({ ...base, name: "Sacks O'Neil Ñ" }).success
    ).toBe(true)
  })

  it("rejects an infinite conversion factor", () => {
    expect(
      validateProductUpdate({ ...base, conversionFactor: Infinity }).success
    ).toBe(false)
  })

  it("explains numeric problems in plain language", () => {
    const wrongType = validateProductUpdate({
      ...base,
      conversionFactor: "2" as unknown as number,
    })
    const tooLarge = validateProductUpdate({
      ...base,
      conversionFactor: 1001,
    })

    expect(wrongType.success).toBe(false)
    if (!wrongType.success) {
      expect(wrongType.errors.conversionFactor).toBe("Please enter a number.")
    }
    expect(tooLarge.success).toBe(false)
    if (!tooLarge.success) {
      expect(tooLarge.errors.conversionFactor).toBe(
        "Please enter a conversion factor of 1,000 or less."
      )
    }
  })

  it("accepts a zero low-stock threshold", () => {
    expect(
      validateProductUpdate({ ...base, lowStockThreshold: 0 }).success
    ).toBe(true)
  })

  it("caps each keyword at 20 characters", () => {
    expect(
      validateProductUpdate({ ...base, keywords: ["x".repeat(21)] }).success
    ).toBe(false)
  })

  it("caps the keywords array", () => {
    const many = Array.from({ length: 13 }, (_, i) => `kw${i}`)
    expect(validateProductUpdate({ ...base, keywords: many }).success).toBe(
      false
    )
  })

  it("accepts a keyword list within bounds", () => {
    const some = Array.from({ length: 5 }, (_, i) => `kw${i}`)
    expect(validateProductUpdate({ ...base, keywords: some }).success).toBe(
      true
    )
  })
})
