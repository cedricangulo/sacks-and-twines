import { describe, expect, it } from "vitest"
import { OtpSchema, SignInSchema } from "./validation"

describe("SignInSchema", () => {
  it("accepts valid credentials", () => {
    expect(
      SignInSchema.safeParse({
        email: "juan@example.com",
        password: "password123",
      }).success
    ).toBe(true)
  })

  it("rejects an invalid email", () => {
    expect(
      SignInSchema.safeParse({ email: "nope", password: "x" }).success
    ).toBe(false)
  })

  it("rejects an empty password", () => {
    expect(
      SignInSchema.safeParse({ email: "juan@example.com", password: "" })
        .success
    ).toBe(false)
  })

  it("does not trim the password", () => {
    const result = SignInSchema.safeParse({
      email: "juan@example.com",
      password: "  spaces  ",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.password).toBe("  spaces  ")
    }
  })
})

describe("OtpSchema", () => {
  it("accepts an 8-digit code", () => {
    expect(OtpSchema.safeParse({ code: "12345678" }).success).toBe(true)
  })

  it("rejects a short code", () => {
    expect(OtpSchema.safeParse({ code: "1234567" }).success).toBe(false)
  })

  it("rejects a longer code", () => {
    // Previously `.min(8)` accepted any 8+ characters.
    expect(OtpSchema.safeParse({ code: "123456789" }).success).toBe(false)
  })

  it("rejects non-digit characters", () => {
    expect(OtpSchema.safeParse({ code: "aaaaaaaa" }).success).toBe(false)
  })
})
