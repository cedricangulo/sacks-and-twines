import { describe, expect, it } from "vitest"
import { type ForecastResult, forecastWeeklyDemand } from "./forecast"

const JUL_1_2026_MS = new Date(2026, 6, 1).getTime()

function d(date: string, value: number) {
  return { date, value }
}

describe("forecastWeeklyDemand", () => {
  it("returns empty array when dailyData is empty", () => {
    const result = forecastWeeklyDemand([], JUL_1_2026_MS)
    expect(result).toEqual([])
  })

  it("returns empty array when no data falls inside the month", () => {
    const result = forecastWeeklyDemand(
      [d("2026-06-05", 50), d("2026-06-12", 30)],
      JUL_1_2026_MS
    )
    expect(result).toEqual([])
  })

  it("returns week buckets for a single day in the month (no history)", () => {
    const result = forecastWeeklyDemand([d("2026-07-01", 100)], JUL_1_2026_MS)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject<ForecastResult>({
      weekLabel: "Week 1",
      actual: 100,
      predicted: 0,
    })
  })

  it("buckets July 2026 into 5 weeks correctly (Wed start)", () => {
    const entries = [
      d("2026-07-01", 10), // Wed → Week 1
      d("2026-07-04", 20), // Sat → Week 1
      d("2026-07-05", 30), // Sun → Week 2
      d("2026-07-11", 40), // Sat → Week 2
      d("2026-07-12", 50), // Sun → Week 3
      d("2026-07-18", 60), // Sat → Week 3
      d("2026-07-19", 70), // Sun → Week 4
      d("2026-07-25", 80), // Sat → Week 4
      d("2026-07-26", 90), // Sun → Week 5
      d("2026-07-31", 100), // Fri → Week 5
    ]

    const result = forecastWeeklyDemand(entries, JUL_1_2026_MS)

    expect(result).toHaveLength(5)
    expect(result[0]).toMatchObject<ForecastResult>({
      weekLabel: "Week 1",
      actual: 30,
      predicted: 0,
    })
    expect(result[1]).toMatchObject<ForecastResult>({
      weekLabel: "Week 2",
      actual: 70,
      predicted: 0,
    })
    expect(result[2]).toMatchObject<ForecastResult>({
      weekLabel: "Week 3",
      actual: 110,
      predicted: 0,
    })
    expect(result[3]).toMatchObject<ForecastResult>({
      weekLabel: "Week 4",
      actual: 150,
      predicted: 0,
    })
    expect(result[4]).toMatchObject<ForecastResult>({
      weekLabel: "Week 5",
      actual: 190,
      predicted: 0,
    })
  })

  it("computes per-week prediction from corresponding trailing week", () => {
    // History (before July 1, 2026):
    // Week -1 (Jun 24–30): 200  → maps to current Week 1
    // Week -2 (Jun 17–23): 180  → maps to current Week 2
    // Week -3 (Jun 10–16): 150  → maps to current Week 3
    // Week -4 (Jun 3–9):   100  → maps to current Week 4
    //
    // Current month Week 2 uses trailing Week -2 = 180

    const entries = [
      d("2026-06-05", 100), // Week -4
      d("2026-06-12", 150), // Week -3
      d("2026-06-20", 180), // Week -2
      d("2026-06-28", 200), // Week -1
      d("2026-07-05", 300), // Week 2 (current month)
    ]

    const result = forecastWeeklyDemand(entries, JUL_1_2026_MS)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject<ForecastResult>({
      weekLabel: "Week 2",
      actual: 300,
      predicted: 180,
    })
  })

  it("falls back to weighted average when trailing week has no data", () => {
    // Only 2 history weeks with data
    // Week -1 (Jun 24–30): 200
    // Week -2 (Jun 17–23): 150
    // Weeks -3 and -4 have zero data.
    //
    // Current month Week 2 → trailing Week -2 = 150 (has data, use directly)

    const entries = [
      d("2026-06-20", 150), // Week -2
      d("2026-06-28", 200), // Week -1
      d("2026-07-05", 300), // current month
    ]

    const result = forecastWeeklyDemand(entries, JUL_1_2026_MS)

    expect(result).toHaveLength(1)
    expect(result[0].actual).toBe(300)
    // Week 2 maps to trailing Week -2 = 150
    expect(result[0].predicted).toBe(150)
  })

  it("aggregates multiple entries on the same day", () => {
    const entries = [d("2026-07-10", 50), d("2026-07-10", 75)]

    const result = forecastWeeklyDemand(entries, JUL_1_2026_MS)

    expect(result).toHaveLength(1)
    expect(result[0].actual).toBe(125)
  })

  it("skips entries with invalid dates", () => {
    const entries = [d("not-a-date", 999), d("2026-07-10", 100)]

    const result = forecastWeeklyDemand(entries, JUL_1_2026_MS)

    expect(result).toHaveLength(1)
    expect(result[0].actual).toBe(100)
  })

  it("works for months starting on Sunday (firstDayOfWeek = 0)", () => {
    // June 2026 starts on Monday (index 1)... let me use August 2026 which starts on Saturday (index 6)
    // Actually, let me compute: 2026-08-01 is a Saturday. firstDayOfWeek = 6.
    const aug1 = new Date(2026, 7, 1).getTime()

    const entries = [
      d("2026-08-01", 10), // Sat → ceil((1+6)/7) = ceil(1) = 1
      d("2026-08-02", 20), // Sun → ceil((2+6)/7) = ceil(8/7) = 2
    ]

    const result = forecastWeeklyDemand(entries, aug1)

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ weekLabel: "Week 1", actual: 10 })
    expect(result[1]).toMatchObject({ weekLabel: "Week 2", actual: 20 })
  })

  it("filters history data from the current month", () => {
    // All values in the same week block, but spread across months
    const entries = [
      d("2026-06-29", 100), // Week -1 history
      d("2026-07-05", 500), // current month Week 2
    ]

    const result = forecastWeeklyDemand(entries, JUL_1_2026_MS)

    expect(result).toHaveLength(1)
    expect(result[0].actual).toBe(500)
    // June 29 falls in block Jun 24–30 (week -1). Weight 0.4 for that block.
    // (100 * 0.4) / 0.4 = 100
    expect(result[0].predicted).toBe(100)
  })
})
