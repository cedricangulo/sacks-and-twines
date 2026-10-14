import { describe, expect, it } from "vitest"
import { resolveBusinessTime } from "./backdate"
import { BACKDATE_GRACE_MS, BACKDATE_WINDOW_MS } from "./constants"

// Fixed clock so window/grace edges are deterministic.
const NOW = new Date(2025, 10, 12, 12, 0, 0).getTime()

describe("resolveBusinessTime", () => {
  it("stamps now when no override is given", () => {
    expect(
      resolveBusinessTime({ createdAt: undefined, isOwner: false, nowMs: NOW })
    ).toEqual({ eventMs: NOW, wasBackdated: false })
  })

  it("accepts an owner backdate within the window", () => {
    const backdated = NOW - 2 * 24 * 60 * 60 * 1000
    expect(
      resolveBusinessTime({ createdAt: backdated, isOwner: true, nowMs: NOW })
    ).toEqual({ eventMs: backdated, wasBackdated: true })
  })

  it("treats a same-day earlier time as backdated", () => {
    const morning = NOW - 3 * 60 * 60 * 1000
    const result = resolveBusinessTime({
      createdAt: morning,
      isOwner: true,
      nowMs: NOW,
    })
    expect(result.eventMs).toBe(morning)
    expect(result.wasBackdated).toBe(true)
  })

  it("rejects a non-owner override even for a recent date", () => {
    expect(() =>
      resolveBusinessTime({
        createdAt: NOW - 60 * 60 * 1000,
        isOwner: false,
        nowMs: NOW,
      })
    ).toThrowError("Only owners can backdate a transaction")
  })

  it("rejects future dates beyond the grace", () => {
    expect(() =>
      resolveBusinessTime({
        createdAt: NOW + BACKDATE_GRACE_MS + 1000,
        isOwner: true,
        nowMs: NOW,
      })
    ).toThrowError("Transaction date cannot be in the future")
  })

  it("absorbs client clock skew within the grace", () => {
    const slightlyAhead = NOW + BACKDATE_GRACE_MS - 1000
    expect(
      resolveBusinessTime({
        createdAt: slightlyAhead,
        isOwner: true,
        nowMs: NOW,
      }).eventMs
    ).toBe(slightlyAhead)
  })

  it("rejects dates older than the window", () => {
    expect(() =>
      resolveBusinessTime({
        createdAt: NOW - BACKDATE_WINDOW_MS - 1000,
        isOwner: true,
        nowMs: NOW,
      })
    ).toThrowError("Transaction date cannot be more than 30 days in the past")
  })

  it("accepts the window edge exactly", () => {
    const edge = NOW - BACKDATE_WINDOW_MS
    expect(
      resolveBusinessTime({ createdAt: edge, isOwner: true, nowMs: NOW })
        .eventMs
    ).toBe(edge)
  })
})
