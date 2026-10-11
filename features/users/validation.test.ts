import { describe, expect, it } from "vitest"
import { StaffSchema } from "./validation"

describe("StaffSchema", () => {
  const base = {
    name: "Juan Dela Cruz",
    email: "juan@example.com",
    password: "password123",
  }

  it("accepts valid staff details", () => {
    expect(StaffSchema.safeParse(base).success).toBe(true)
  })

  it("accepts a name with an apostrophe and an accented character", () => {
    // Philippines-specific input; a naive [^a-zA-Z0-9 ] allowlist would
    // wrongly reject both of these.
    expect(
      StaffSchema.safeParse({ ...base, name: "María O'Brien" }).success
    ).toBe(true)
  })

  it("rejects a whitespace-only name", () => {
    expect(StaffSchema.safeParse({ ...base, name: "   " }).success).toBe(false)
  })

  it("rejects a name over 255 characters", () => {
    expect(
      StaffSchema.safeParse({ ...base, name: "x".repeat(256) }).success
    ).toBe(false)
  })

  it("rejects markup in a name rather than stripping it", () => {
    expect(
      StaffSchema.safeParse({ ...base, name: "<b>Juan</b>" }).success
    ).toBe(false)
  })

  it("rejects a password under 8 characters", () => {
    expect(StaffSchema.safeParse({ ...base, password: "short" }).success).toBe(
      false
    )
  })

  it("accepts a password at the 128 character limit", () => {
    expect(
      StaffSchema.safeParse({ ...base, password: "x".repeat(128) }).success
    ).toBe(true)
  })

  it("rejects a password over 128 characters", () => {
    // Bounds the scrypt hashing cost on an unauthenticated-ish path.
    expect(
      StaffSchema.safeParse({ ...base, password: "x".repeat(129) }).success
    ).toBe(false)
  })

  it("rejects an invalid email", () => {
    expect(
      StaffSchema.safeParse({ ...base, email: "not-an-email" }).success
    ).toBe(false)
  })

  it("rejects an email over 254 characters", () => {
    const email = `${"a".repeat(250)}@example.com`
    expect(StaffSchema.safeParse({ ...base, email }).success).toBe(false)
  })

  it("does not trim the password", () => {
    const result = StaffSchema.safeParse({ ...base, password: " pass123 " })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.password).toBe(" pass123 ")
    }
  })
})
