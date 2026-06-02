"use client"

import { useMemo } from "react"
import type { CalendarSummaryEntry } from "./use-calendar-summary"

interface CalendarDay {
  day: number
  dispatchCount: number
  adjustmentCount: number
  hasActivity: boolean
}

interface UseCalendarDaysResult {
  days: CalendarDay[]
  daysInMonth: number
  firstDayOfWeek: number
  prevMonthDays: number
}

/** Derives calendar cell data from summary entries for a given month/year.
 * @param month - Zero-indexed month (0 = January).
 * @param year - Four-digit year.
 * @param summary - Calendar summary entries from useCalendarSummary.
 */
export function useCalendarDays(
  month: number,
  year: number,
  summary: CalendarSummaryEntry[]
): UseCalendarDaysResult {
  const summaryMap = useMemo(() => {
    const map = new Map<number, CalendarSummaryEntry>()
    for (const entry of summary) {
      map.set(entry.day, entry)
    }
    return map
  }, [summary])

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const prevMonthDays = new Date(year, month, 0).getDate()

  const days = useMemo(() => {
    const result: CalendarDay[] = []

    for (let i = 1; i <= daysInMonth; i++) {
      const entry = summaryMap.get(i)
      const dispatchCount = entry?.dispatchCount ?? 0
      const adjustmentCount = entry?.adjustmentCount ?? 0
      result.push({
        day: i,
        dispatchCount,
        adjustmentCount,
        hasActivity: dispatchCount > 0 || adjustmentCount > 0,
      })
    }
    return result
  }, [daysInMonth, summaryMap])

  return { days, daysInMonth, firstDayOfWeek, prevMonthDays }
}
