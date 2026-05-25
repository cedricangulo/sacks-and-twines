import { describe, expect, it } from "vitest"
import { getTimestampFromPreset } from "./date-presets"

describe("getTimestampFromPreset", () => {
  it('returns undefined for "all"', () => {
    expect(getTimestampFromPreset("all", Date.now())).toBeUndefined()
  })

  it('returns start of today for "today"', () => {
    const expected = new Date()
    expected.setHours(0, 0, 0, 0)
    const result = getTimestampFromPreset("today", expected.getTime())
    expect(result).toBe(expected.getTime())
  })

  it('returns 7 days ago for "7d"', () => {
    const now = Date.now()
    const result = getTimestampFromPreset("7d", now)
    expect(result).toBe(now - 7 * 86400000)
  })

  it('returns 30 days ago for "30d"', () => {
    const now = Date.now()
    const result = getTimestampFromPreset("30d", now)
    expect(result).toBe(now - 30 * 86400000)
  })

  it("returns undefined for unknown preset", () => {
    expect(getTimestampFromPreset("unknown", Date.now())).toBeUndefined()
  })

  it("returns undefined for empty string", () => {
    expect(getTimestampFromPreset("", Date.now())).toBeUndefined()
  })
})
