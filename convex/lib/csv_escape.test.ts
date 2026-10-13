import { describe, expect, it } from "vitest"
import { escapeCsv } from "./csv_escape"

describe("escapeCsv", () => {
  it("leaves ordinary values untouched", () => {
    expect(escapeCsv("Acme Trading")).toBe("Acme Trading")
    expect(escapeCsv(null)).toBe("")
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
  ])("prefixes %j: parsers that strip whitespace would evaluate it", (value) => {
    expect(escapeCsv(value)).toBe(`'${value}`)
  })

  it("keeps the quote prefix first when the field also needs quoting", () => {
    expect(escapeCsv("=1+1,2")).toBe('"\'=1+1,2"')
  })
})
