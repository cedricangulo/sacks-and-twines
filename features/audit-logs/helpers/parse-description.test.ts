import { describe, expect, it } from "vitest"
import { parseDescription } from "./parse-description"

describe("parseDescription", () => {
  it("parses structured JSON with summary and details", () => {
    const result = parseDescription(
      JSON.stringify({
        summary: "Stocked in 100 units of Product (BAT-001)",
        details: {
          product: "Product",
          batchCode: "BAT-001",
          quantity: 100,
          supplier: "Supplier Co",
        },
      })
    )

    expect(result.summary).toBe("Stocked in 100 units of Product (BAT-001)")
    expect(result.details).toEqual({
      product: "Product",
      batchCode: "BAT-001",
      quantity: "100",
      supplier: "Supplier Co",
    })
    expect(result.changes).toBeNull()
    expect(result.isFlat).toBe(false)
  })

  it("parses structured JSON with summary and changes", () => {
    const result = parseDescription(
      JSON.stringify({
        summary: "Updated batch BAT-001",
        changes: {
          qty_received: { old: 100, new: 150 },
          supplier_name: { old: "Old Co", new: "New Co" },
        },
      })
    )

    expect(result.summary).toBe("Updated batch BAT-001")
    expect(result.changes).toEqual({
      qty_received: { old: 100, new: 150 },
      supplier_name: { old: "Old Co", new: "New Co" },
    })
    expect(result.details).toBeNull()
    expect(result.isFlat).toBe(false)
  })

  it("parses structured JSON with summary, details, and changes", () => {
    const result = parseDescription(
      JSON.stringify({
        summary: "Dispatched 2 products (BAT-001, BAT-002)",
        details: {
          customerReference: "Acme Corp",
          totalItems: 2,
        },
        changes: {
          BAT001: { old: 100, new: 90 },
          BAT002: { old: 50, new: 40 },
        },
      })
    )

    expect(result.summary).toBe("Dispatched 2 products (BAT-001, BAT-002)")
    expect(result.details).toEqual({
      customerReference: "Acme Corp",
      totalItems: "2",
    })
    expect(result.changes).toEqual({
      BAT001: { old: 100, new: 90 },
      BAT002: { old: 50, new: 40 },
    })
    expect(result.isFlat).toBe(false)
  })

  it("parses flat JSON (auth-style) with reason and email", () => {
    const result = parseDescription(
      JSON.stringify({
        action: "auth_sign_in_failed",
        email: "test@example.com",
        reason: "invalid_credentials",
      })
    )

    expect(result.summary).toBe("invalid_credentials for test@example.com")
    expect(result.details).toEqual({
      action: "auth_sign_in_failed",
      email: "test@example.com",
      reason: "invalid_credentials",
    })
    expect(result.changes).toBeNull()
    expect(result.isFlat).toBe(true)
  })

  it("parses flat JSON with only action", () => {
    const result = parseDescription(
      JSON.stringify({
        action: "auth_sign_in_failed",
        message: "Account locked",
      })
    )

    expect(result.summary).toBe("auth_sign_in_failed Account locked")
    expect(result.details).toEqual({
      action: "auth_sign_in_failed",
      message: "Account locked",
    })
    expect(result.isFlat).toBe(true)
  })

  it("returns plain string as-is", () => {
    const result = parseDescription("Created product Test (SKU-123)")

    expect(result.summary).toBe("Created product Test (SKU-123)")
    expect(result.details).toBeNull()
    expect(result.changes).toBeNull()
    expect(result.isFlat).toBe(true)
  })

  it("handles invalid JSON gracefully", () => {
    const result = parseDescription("not json at all {{{")

    expect(result.summary).toBe("not json at all {{{")
    expect(result.details).toBeNull()
    expect(result.changes).toBeNull()
    expect(result.isFlat).toBe(true)
  })

  it("handles JSON array as fallback", () => {
    const result = parseDescription(JSON.stringify(["a", "b"]))

    expect(result.summary).toBe(JSON.stringify(["a", "b"]))
    expect(result.details).toBeNull()
    expect(result.changes).toBeNull()
    expect(result.isFlat).toBe(true)
  })
})
