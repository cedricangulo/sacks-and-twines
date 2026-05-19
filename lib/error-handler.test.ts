import { beforeEach, describe, expect, it, vi } from "vitest"
import { handleConvexError } from "./error-handler"

const mockIsRateLimitError = vi.fn()

vi.mock("@convex-dev/rate-limiter", () => ({
  isRateLimitError: (...args: unknown[]) => mockIsRateLimitError(...args),
}))

function rateLimitError(retryAfter: number) {
  return {
    data: { retryAfter },
    name: "RateLimitError",
  }
}

describe("handleConvexError", () => {
  beforeEach(() => {
    mockIsRateLimitError.mockReturnValue(false)
  })

  // ── Rate limit ────────────────────────────────────────────
  it("returns rate limit message when error is rate-limited", () => {
    mockIsRateLimitError.mockReturnValue(true)
    const result = handleConvexError(rateLimitError(5000), "Failed")
    expect(result).toEqual({
      title: "Too many requests",
      description: "Please wait 5 seconds before trying again.",
    })
  })

  // ── Auth / session ────────────────────────────────────────
  it("maps 'Unauthorized' to session expired message", () => {
    const result = handleConvexError(new Error("Unauthorized"), "Failed")
    expect(result).toEqual({
      title: "Session expired",
      description: "Please sign in again.",
    })
  })

  // ── Permissions ───────────────────────────────────────────
  it("maps 'Only owners can' to permission denied message", () => {
    const result = handleConvexError(
      new Error("Only owners can create products"),
      "Failed"
    )
    expect(result).toEqual({
      title: "Permission denied",
      description: "Only the owner can perform this action.",
    })
  })

  // ── Not found ─────────────────────────────────────────────
  it("maps 'Product not found' to not found message", () => {
    const result = handleConvexError(new Error("Product not found"), "Failed")
    expect(result).toEqual({
      title: "Not found",
      description: "The record could not be found.",
    })
  })

  it("maps 'Batch not found' to not found message", () => {
    const result = handleConvexError(new Error("Batch not found"), "Failed")
    expect(result).toEqual({
      title: "Not found",
      description: "The record could not be found.",
    })
  })

  // ── Duplicates ────────────────────────────────────────────
  it("maps 'A product with this name already exists' to duplicate message", () => {
    const result = handleConvexError(
      new Error("A product with this name already exists"),
      "Failed"
    )
    expect(result).toEqual({
      title: "Duplicate entry",
      description: "A record with this information already exists.",
    })
  })

  it("maps 'A user with this email already exists' to duplicate message", () => {
    const result = handleConvexError(
      new Error("A user with this email already exists"),
      "Failed"
    )
    expect(result).toEqual({
      title: "Duplicate entry",
      description: "A record with this information already exists.",
    })
  })

  // ── Batch void ────────────────────────────────────────────
  it("maps 'cannot void a batch that has been used in dispatches'", () => {
    const result = handleConvexError(
      new Error("Cannot void a batch that has been used in dispatches"),
      "Failed"
    )
    expect(result).toEqual({
      title: "Cannot void",
      description:
        "This batch has been used in dispatches and cannot be voided.",
    })
  })

  it("maps 'Cannot update a voided batch' message", () => {
    const result = handleConvexError(
      new Error("Cannot update a voided batch"),
      "Failed"
    )
    expect(result).toEqual({
      title: "Cannot update",
      description: "This batch has been voided and cannot be updated.",
    })
  })

  it("maps 'Only active batches can be voided' message", () => {
    const result = handleConvexError(
      new Error("Only active batches can be voided"),
      "Failed"
    )
    expect(result).toEqual({
      title: "Cannot void",
      description: "Only active batches can be voided.",
    })
  })

  it("maps 'Cannot change quantity or cost' message", () => {
    const result = handleConvexError(
      new Error(
        "Cannot change quantity or cost — this batch already has dispatch or adjustment history"
      ),
      "Failed"
    )
    expect(result).toEqual({
      title: "Cannot modify",
      description:
        "This batch has dispatch or adjustment history and cannot be modified.",
    })
  })

  it("maps 'Cannot change product for batch' message", () => {
    const result = handleConvexError(
      new Error("Cannot change product for batch BAT-1234"),
      "Failed"
    )
    expect(result).toEqual({
      title: "Cannot modify",
      description: "The product for this batch cannot be changed.",
    })
  })

  // ── Insufficient stock (keeps specific message) ───────────
  it("maps 'Insufficient stock for' but keeps specific message", () => {
    const result = handleConvexError(
      new Error(
        "Insufficient stock for Cement — requested 50 piece, only 10 piece available"
      ),
      "Dispatch failed"
    )
    expect(result).toEqual({
      title: "Insufficient stock",
      description:
        "Insufficient stock for Cement — requested 50 piece, only 10 piece available",
    })
  })

  // ── Dispatch ──────────────────────────────────────────────
  it("maps 'Sacks can only be dispatched in whole units' message", () => {
    const result = handleConvexError(
      new Error(
        "Sacks can only be dispatched in whole units — 1.5 is not valid for Cement"
      ),
      "Dispatch failed"
    )
    expect(result).toEqual({
      title: "Invalid quantity",
      description: "Sacks can only be dispatched in whole units.",
    })
  })

  // ── Archive / status ──────────────────────────────────────
  it("maps 'Cannot stock into an archived product' message", () => {
    const result = handleConvexError(
      new Error("Cannot stock into an archived product"),
      "Failed to add inventory"
    )
    expect(result).toEqual({
      title: "Product archived",
      description: "This product has been archived and cannot be stocked into.",
    })
  })

  it("maps 'Supplier is not archived' message", () => {
    const result = handleConvexError(
      new Error("Supplier is not archived"),
      "Failed"
    )
    expect(result).toEqual({
      title: "Cannot restore",
      description: "This supplier is not archived.",
    })
  })

  it("maps 'Supplier is already archived' message", () => {
    const result = handleConvexError(
      new Error("Supplier is already archived"),
      "Failed"
    )
    expect(result).toEqual({
      title: "Cannot archive",
      description: "This supplier is already archived.",
    })
  })

  it("maps 'active batch' in archive error", () => {
    const result = handleConvexError(
      new Error("Cannot archive supplier FooBar: 3 active batch(es) exist"),
      "Failed"
    )
    expect(result).toEqual({
      title: "Cannot archive",
      description:
        "This supplier has existing batch records. Reassign or delete batches before archiving.",
    })
  })

  it("maps generic 'archived' error as catch-all", () => {
    const result = handleConvexError(
      new Error("Product Cement is archived"),
      "Dispatch failed"
    )
    expect(result).toEqual({
      title: "Cannot modify",
      description: "This record has been archived and cannot be modified.",
    })
  })

  // ── Weight / unit config ──────────────────────────────────
  it("maps 'weight-per-unit' error message", () => {
    const result = handleConvexError(
      new Error(
        "Product Test Twine has no weight-per-unit configured for kg dispatch"
      ),
      "Dispatch failed"
    )
    expect(result).toEqual({
      title: "Configuration error",
      description:
        "Cannot dispatch in kilograms — weight per unit is not configured for this product.",
    })
  })

  // ── Users ─────────────────────────────────────────────────
  it("maps 'You cannot deactivate yourself' message", () => {
    const result = handleConvexError(
      new Error("You cannot deactivate yourself"),
      "Failed"
    )
    expect(result).toEqual({
      title: "Cannot deactivate",
      description: "You cannot deactivate your own account.",
    })
  })

  it("maps 'Can only deactivate staff users' message", () => {
    const result = handleConvexError(
      new Error("Can only deactivate staff users"),
      "Failed"
    )
    expect(result).toEqual({
      title: "Cannot deactivate",
      description: "Only staff users can be deactivated.",
    })
  })

  // ── Product creation ──────────────────────────────────────
  it("maps 'Name, category, and base UOM are required for new products' message", () => {
    const result = handleConvexError(
      new Error("Name, category, and base UOM are required for new products"),
      "Failed to add inventory"
    )
    expect(result).toEqual({
      title: "Missing fields",
      description:
        "Name, category, and base UOM are required when creating a new product.",
    })
  })

  // ── SKU generation ────────────────────────────────────────
  it("maps 'Failed to generate unique SKU code' message", () => {
    const result = handleConvexError(
      new Error("Failed to generate unique SKU code after 20 attempts"),
      "Failed"
    )
    expect(result).toEqual({
      title: "SKU generation failed",
      description: "Failed to generate a unique SKU code. Please try again.",
    })
  })

  // ── Batch code generation ─────────────────────────────────
  it("maps 'Failed to generate unique batch code' message", () => {
    const result = handleConvexError(
      new Error("Failed to generate unique batch code after 20 attempts"),
      "Failed"
    )
    expect(result).toEqual({
      title: "Code generation failed",
      description: "Failed to generate a unique batch code. Please try again.",
    })
  })

  // ── Upload ─────────────────────────────────────────────────
  it("maps 'Failed to retrieve uploaded image' message", () => {
    const result = handleConvexError(
      new Error("Failed to retrieve uploaded image: some-url"),
      "Failed"
    )
    expect(result).toEqual({
      title: "Upload error",
      description:
        "The uploaded image could not be retrieved. Please try uploading again.",
    })
  })

  // ── Supplier required ─────────────────────────────────────
  it("maps 'requires a supplier' message", () => {
    const result = handleConvexError(
      new Error("Product Cement requires a supplier"),
      "Failed"
    )
    expect(result).toEqual({
      title: "Supplier required",
      description: "This product requires a supplier. Please select one.",
    })
  })

  // ── Product ID required ───────────────────────────────────
  it("maps 'Product ID is required for existing mode' message", () => {
    const result = handleConvexError(
      new Error("Product ID is required for existing mode"),
      "Failed"
    )
    expect(result).toEqual({
      title: "Invalid selection",
      description: "Please select an existing product to stock into.",
    })
  })

  // ── Fallback ──────────────────────────────────────────────
  it("returns generic message for unknown error", () => {
    const result = handleConvexError(
      new Error("Some unexpected database error"),
      "Failed to do thing"
    )
    expect(result).toEqual({
      title: "Failed to do thing",
      description: "Something went wrong. Please try again.",
    })
  })

  it("returns generic message for non-Error throw", () => {
    const result = handleConvexError("just a string", "Failed")
    expect(result).toEqual({
      title: "Failed",
      description: "Something went wrong. Please try again.",
    })
  })

  it("returns generic message for null throw", () => {
    const result = handleConvexError(null, "Failed")
    expect(result).toEqual({
      title: "Failed",
      description: "Something went wrong. Please try again.",
    })
  })

  // ── Case insensitivity ────────────────────────────────────
  it("matches case-insensitively", () => {
    const result = handleConvexError(new Error("unauthorized"), "Failed")
    expect(result).toEqual({
      title: "Session expired",
      description: "Please sign in again.",
    })
  })
})
