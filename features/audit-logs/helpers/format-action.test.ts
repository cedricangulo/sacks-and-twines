import { describe, expect, it } from "vitest"
import { formatAction } from "./format-action"

describe("formatAction", () => {
  it("converts snake_case to Title Case", () => {
    expect(formatAction("auth_sign_in")).toBe("Auth Sign In")
  })

  it("handles single word", () => {
    expect(formatAction("login")).toBe("Login")
  })

  it("handles empty string", () => {
    expect(formatAction("")).toBe("")
  })

  it("handles already formatted string", () => {
    expect(formatAction("Product Create")).toBe("Product Create")
  })

  it("handles multi-word action", () => {
    expect(formatAction("product_batch_create")).toBe("Product Batch Create")
  })
})
