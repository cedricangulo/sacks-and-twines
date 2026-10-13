import { describe, expect, it } from "vitest"
import { escapeCsv as serverEscapeCsv } from "@/convex/lib/csv_escape"
import { escapeCsv, formatCsv } from "./csv"

describe("escapeCsv", () => {
  it("leaves ordinary values untouched", () => {
    expect(escapeCsv("Acme Trading")).toBe("Acme Trading")
    expect(escapeCsv(42)).toBe("42")
    expect(escapeCsv(null)).toBe("")
    expect(escapeCsv(undefined)).toBe("")
  })

  it.each([
    "=cmd",
    "+cmd",
    "-cmd",
    "@cmd",
    "\tcmd",
    "\rcmd",
  ])("prefixes %j with a single quote so spreadsheets render it as text", (value) => {
    expect(escapeCsv(value)).toBe(`'${value}`)
  })

  it.each([
    " =1+1",
    "  @evil",
    "\t+cmd",
  ])("prefixes %j: parsers that strip whitespace would evaluate it", (value) => {
    expect(escapeCsv(value)).toBe(`'${value}`)
  })

  it("stays in parity with the Convex copy", () => {
    const cases: Array<string | number | null | undefined> = [
      "plain",
      "=cmd",
      "+cmd",
      "-2+3",
      "@x",
      " =1+1",
      "a,b",
      'q"q',
      "a\nb",
      "=1+1,2",
      42,
      null,
      undefined,
    ]
    for (const value of cases) {
      expect(escapeCsv(value)).toBe(serverEscapeCsv(value))
    }
  })

  it("keeps the quote prefix first when the field also needs quoting", () => {
    // Quoting wraps the whole field: the `'` must stay the first character
    // of the parsed value or Excel evaluates the formula anyway.
    expect(escapeCsv("=1+1,2")).toBe('"\'=1+1,2"')
  })

  it("does not prefix values with the trigger characters mid-string", () => {
    expect(escapeCsv("a=b")).toBe("a=b")
    expect(escapeCsv("well-known")).toBe("well-known")
  })
})

describe("formatCsv", () => {
  it("defuses formula prefixes in body rows", () => {
    const out = formatCsv(["Ref"], [["-2+3+cmd"]])
    expect(out).toContain("'-2+3+cmd")
  })
})
