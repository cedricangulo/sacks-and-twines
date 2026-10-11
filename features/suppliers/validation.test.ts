import { describe, expect, it } from "vitest"
import { validateSupplier } from "./validation"

const base = {
  companyName: "Acme Trading Corp.",
  contactPerson: "Juan Dela Cruz",
  contactNumber: "09171234567",
  address: "123 Rizal St., Brgy. San Jose",
}

describe("validateSupplier", () => {
  it("accepts valid supplier details", () => {
    expect(validateSupplier(base).success).toBe(true)
  })

  it("accepts a PH landline contact number", () => {
    expect(
      validateSupplier({ ...base, contactNumber: "+63281234567" }).success
    ).toBe(true)
  })

  it("rejects a malformed contact number", () => {
    expect(validateSupplier({ ...base, contactNumber: "12345" }).success).toBe(
      false
    )
  })

  it("strips formatting out of the contact number", () => {
    const result = validateSupplier({ ...base, contactNumber: "0917-123-4567" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.contactNumber).toBe("09171234567")
    }
  })

  it("rejects markup in the company name rather than stripping it", () => {
    expect(
      validateSupplier({ ...base, companyName: "<b>Acme</b>" }).success
    ).toBe(false)
  })

  it("accepts an apostrophe in the contact person", () => {
    expect(
      validateSupplier({ ...base, contactPerson: "O'Brien" }).success
    ).toBe(true)
  })

  it("rejects a company name under 2 characters", () => {
    expect(validateSupplier({ ...base, companyName: "A" }).success).toBe(false)
  })

  it("rejects an address under 10 characters", () => {
    expect(validateSupplier({ ...base, address: "short" }).success).toBe(false)
  })

  it("accepts ordinary punctuation in the address", () => {
    // The address is free text and is not allowlisted.
    expect(
      validateSupplier({
        ...base,
        address: "Unit 4-B, Lot 22, Block 7, Zone 3, Brgy. San Jose",
      }).success
    ).toBe(true)
  })

  it("rejects an address over 500 characters", () => {
    expect(
      validateSupplier({ ...base, address: "x".repeat(501) }).success
    ).toBe(false)
  })
})
