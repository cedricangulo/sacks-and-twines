import { describe, expect, it } from "vitest"
import { z } from "zod"
import { formatZodErrors } from "./validation"

describe("formatZodErrors", () => {
  it("maps top-level field errors by name", () => {
    const schema = z.object({ name: z.string().min(1) })
    const result = schema.safeParse({ name: "" })
    expect(formatZodErrors(result.error!)).toEqual({ name: expect.any(String) })
  })

  it("keys nested array errors by their full dotted path", () => {
    const schema = z.object({
      items: z.array(z.object({ quantity: z.number().min(0.01) })),
    })
    const result = schema.safeParse({ items: [{ quantity: 0 }] })

    // Regression guard: the previous implementation read only `issue.path[0]`,
    // which produced the key "0" for this issue.
    const errors = formatZodErrors(result.error!)
    expect(errors["items.0.quantity"]).toBeDefined()
    expect(errors["0"]).toBeUndefined()
  })

  it("ignores root-level issues that have no field path", () => {
    const result = z.string().safeParse(123)
    expect(formatZodErrors(result.error!)).toEqual({})
  })

  it("keeps the first message when one field reports twice", () => {
    const schema = z.object({
      reason: z
        .string()
        .refine((v) => v.length > 10, "Too short")
        .refine((v) => v.startsWith("ok"), "Must start with 'ok'"),
    })
    const result = schema.safeParse({ reason: "no" })

    // Both issues share the path "reason"; the first message is the one kept.
    const errors = formatZodErrors(result.error!)
    expect(errors.reason).toBe("Too short")
  })
})
