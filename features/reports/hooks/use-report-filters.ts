"use client"

import { parseAsInteger, useQueryStates } from "nuqs"
import { useEffect, useMemo } from "react"

const now = new Date()
const CURRENT_MONTH = now.getMonth()
const CURRENT_YEAR = now.getFullYear()

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function clampDay(day: number | null, year: number, month: number) {
  if (day === null) return null
  const max = getDaysInMonth(year, month)
  return Math.min(day, max)
}

const calendarParsers = {
  month: parseAsInteger.withDefault(CURRENT_MONTH),
  year: parseAsInteger.withDefault(CURRENT_YEAR),
  day: parseAsInteger,
  page: parseAsInteger.withDefault(1),
}

const nuqsOptions = { history: "replace" as const, shallow: false as const }

// Calendar navigation and day selection state synced to URL query params.
export function useReportFilters() {
  const [filters, setQueries] = useQueryStates(calendarParsers, nuqsOptions)

  const { month, year, day, page } = filters

  // Clamp year and month to current limits if URL has out-of-range values.
  useEffect(() => {
    const updates: Record<string, number> = {}
    if (year > CURRENT_YEAR) updates.year = CURRENT_YEAR
    if (year === CURRENT_YEAR && month > CURRENT_MONTH) {
      updates.month = CURRENT_MONTH
    }
    if (Object.keys(updates).length > 0) {
      setQueries(updates)
    }
  }, [year, month, setQueries])

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
    return new Date(year, month, day).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    })
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
    currentMonth: CURRENT_MONTH,
    currentYear: CURRENT_YEAR,
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
