import { describe, expect, it } from "vitest"
import { dateInputToMs, dateTimeToMs, nowTimeString } from "./form-primitives"

describe("dateInputToMs", () => {
  it("returns undefined for an empty value (meaning now)", () => {
    expect(dateInputToMs("")).toBeUndefined()
    expect(dateInputToMs("   ")).toBeUndefined()
  })

  it("resolves a date to local midnight millis", () => {
    const ms = dateInputToMs("2025-11-12")
    expect(ms).toBe(new Date("2025-11-12T00:00:00").getTime())
  })
})

describe("nowTimeString", () => {
  it("formats the clock time as HH:MM", () => {
    const date = new Date(2025, 10, 12, 9, 5, 30)
    expect(nowTimeString(date)).toBe("09:05")
  })
})

describe("dateTimeToMs", () => {
  it("returns undefined when no date is picked (meaning now)", () => {
    expect(dateTimeToMs(undefined, "")).toBeUndefined()
    expect(dateTimeToMs(undefined, "10:30")).toBeUndefined()
  })

  it("combines a picked date and time into local millis", () => {
    const date = new Date(2025, 10, 12)
    const ms = dateTimeToMs(date, "10:30")
    const expected = new Date(2025, 10, 12, 10, 30, 0, 0).getTime()
    expect(ms).toBe(expected)
  })

  it("falls back to the current clock time when time is empty", () => {
    const now = new Date(2025, 10, 12, 14, 35, 0)
    const date = new Date(2025, 10, 10)
    const ms = dateTimeToMs(date, "", now)
    const expected = new Date(2025, 10, 10, 14, 35, 0, 0).getTime()
    expect(ms).toBe(expected)
  })

  it("returns undefined for an invalid time", () => {
    const date = new Date(2025, 10, 12)
    expect(dateTimeToMs(date, "99:99")).toBeUndefined()
    expect(dateTimeToMs(date, "nope")).toBeUndefined()
  })
})
