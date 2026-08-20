"use client"

import { useMemo, useState } from "react"
import { MONTH_NAMES } from "@/features/reports/constants"
import { type DateRangePreset } from "../constants"

export function useDashboardDateRanges() {
  const now = useMemo(() => new Date(), [])
  const [rangePreset, setRangePreset] = useState<DateRangePreset>("90d")
  const startMs = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
    [now]
  )
  const endMs = useMemo(
    () =>
      new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      ).getTime(),
    [now]
  )
  const nowTs = now.getTime()
  const velocityStartMs = useMemo(() => {
    switch (rangePreset) {
      case "7d":
        return nowTs - 7 * 24 * 60 * 60 * 1000
      case "30d":
        return nowTs - 30 * 24 * 60 * 60 * 1000
      case "90d":
        return nowTs - 90 * 24 * 60 * 60 * 1000
    }
  }, [nowTs, rangePreset])
  const velocityEndMs = nowTs

  const monthLabel = `${MONTH_NAMES[now.getMonth()]} · Outgoing stock volume`
  const tzOffsetMs = useMemo(
    () => new Date().getTimezoneOffset() * -60 * 1000,
    []
  )
  const velocityDateRange = useMemo(() => {
    const fmt = (ms: number) => {
      const d = new Date(ms)
      return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    }
    return `${fmt(velocityStartMs)} – ${fmt(velocityEndMs)}, ${new Date(velocityEndMs).getFullYear()}`
  }, [velocityStartMs, velocityEndMs])

  return {
    rangePreset,
    setRangePreset,
    startMs,
    endMs,
    velocityStartMs,
    velocityEndMs,
    tzOffsetMs,
    monthLabel,
    velocityDateRange,
  }
}
