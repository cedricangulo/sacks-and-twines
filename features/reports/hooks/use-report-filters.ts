"use client"

import { parseAsInteger, useQueryStates } from "nuqs"
import { useEffect, useMemo } from "react"

/**
 * Read current month/year at call time — not at module load — so the value
 * never goes stale across SSR or long-lived tabs. Fixes
 * `react-doctor/no-impure-call-at-module-scope`.
 */
function getNowParts() {
  const n = new Date()
  return { month: n.getMonth(), year: n.getFullYear() }
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

/** Clamp `day` to the target month’s length (e.g. 31 → 28 for Feb). */
function clampDay(day: number | null, year: number, month: number) {
  if (day === null) return null
  const max = getDaysInMonth(year, month)
  return Math.min(day, max)
}

const nuqsOptions = { history: "replace" as const }

/** Hoisted — reused for `formattedDate`; explicit `Asia/Manila` for hydration consistency. */
const FILTER_DATE_FMT = new Intl.DateTimeFormat("en-PH", {
  month: "long",
  day: "numeric",
  timeZone: "Asia/Manila",
})

/**
 * Calendar navigation + day selection synced to URL (`nuqs`).
 * - `nowParts` is computed inside the hook via `getNowParts()` so it reflects
 *   the real current month/year at render time.
 * - `calendarParsers` are memoized from `nowParts` — no module-level `new Date()`.
 * - Exposes `monthStartMs`/`monthEndMs`/`selectedDay*` timestamps and helpers
 *   `goPrevMonth`/`goNextMonth`/`selectDay`/`setMonthValue`/`setYearValue`.
 */
export function useReportFilters() {
  const nowParts = useMemo(() => getNowParts(), [])
  const calendarParsers = useMemo(
    () => ({
      month: parseAsInteger.withDefault(nowParts.month),
      year: parseAsInteger.withDefault(nowParts.year),
      day: parseAsInteger,
      page: parseAsInteger.withDefault(1),
    }),
    [nowParts.month, nowParts.year]
  )
  const [filters, setQueries] = useQueryStates(calendarParsers, nuqsOptions)

  const { month, year, day, page } = filters

  // Clamp year and month to current limits if URL has out-of-range values.
  useEffect(() => {
    const updates: Record<string, number> = {}
    if (year > nowParts.year) updates.year = nowParts.year
    if (year === nowParts.year && month > nowParts.month) {
      updates.month = nowParts.month
    }
    if (Object.keys(updates).length > 0) {
      setQueries(updates)
    }
  }, [year, month, setQueries, nowParts.month, nowParts.year])

  const monthStartMs = useMemo(
    () => new Date(year, month, 1).getTime(),
    [year, month]
  )
  const monthEndMs = useMemo(
    () => new Date(year, month + 1, 0, 23, 59, 59, 999).getTime(),
    [year, month]
  )

  const selectedDayStartMs = useMemo(() => {
    if (day === null) return null
    return new Date(year, month, day).getTime()
  }, [year, month, day])

  const selectedDayEndMs = useMemo(() => {
    if (day === null) return null
    return new Date(year, month, day, 23, 59, 59, 999).getTime()
  }, [year, month, day])

  const formattedDate = useMemo(() => {
    if (day === null) return null
    return FILTER_DATE_FMT.format(new Date(year, month, day))
  }, [year, month, day])

  const goPrevMonth = () => {
    const newMonth = month === 0 ? 11 : month - 1
    const newYear = month === 0 ? year - 1 : year
    setQueries({
      month: newMonth,
      year: newYear,
      day: clampDay(day, newYear, newMonth),
      page: 1,
    })
  }

  const goNextMonth = () => {
    const newMonth = month === 11 ? 0 : month + 1
    const newYear = month === 11 ? year + 1 : year
    setQueries({
      month: newMonth,
      year: newYear,
      day: clampDay(day, newYear, newMonth),
      page: 1,
    })
  }

  const selectDay = (target: number) => {
    setQueries({ day: target === day ? null : target, page: 1 })
  }

  const setMonthValue = (newMonth: number) => {
    setQueries({ month: newMonth, day: clampDay(day, year, newMonth), page: 1 })
  }

  const setYearValue = (newYear: number) => {
    setQueries({ year: newYear, day: clampDay(day, newYear, month), page: 1 })
  }

  const setPageValue = (newPage: number) => {
    setQueries({ page: newPage })
  }

  return {
    month,
    year,
    selectedDay: day,
    page,
    currentMonth: nowParts.month,
    currentYear: nowParts.year,
    monthStartMs,
    monthEndMs,
    selectedDayStartMs,
    selectedDayEndMs,
    formattedDate,
    goPrevMonth,
    goNextMonth,
    selectDay,
    setMonthValue,
    setYearValue,
    setPageValue,
  }
}
