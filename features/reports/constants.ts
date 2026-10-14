// Number of items per page in detail panel tables.
export const ITEMS_PER_PAGE = 20

// Month names for calendar display.
export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

// Day names for calendar header.
export const DAY_NAMES = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const

// Computes start/end timestamps for the stats bar based on range and selection state.
/**
 * Range the stats bar summarises: the selected day when one is picked, otherwise
 * the browsed month.
 *
 * Intentionally no year/all-time case. Summing every dispatch in those ranges
 * exceeds the server's per-query read ceiling at this table's size, so they can
 * only be answered with partial figures. See
 * `features/reports/components/calendar/monthly-stats-bar.tsx` and
 * docs/PERFORMANCE-AUDIT.md P11.
 */
export function getStatsRange(filters: {
  monthStartMs: number
  monthEndMs: number
  selectedDayStartMs: number | null
  selectedDayEndMs: number | null
}): { startMs: number; endMs: number } {
  if (
    filters.selectedDayStartMs !== null &&
    filters.selectedDayEndMs !== null
  ) {
    return {
      startMs: filters.selectedDayStartMs,
      endMs: filters.selectedDayEndMs,
    }
  }
  return { startMs: filters.monthStartMs, endMs: filters.monthEndMs }
}

// ---------------------------------------------------------------------------
// Quick range presets for export date filters
// ---------------------------------------------------------------------------

export type QuickRange =
  | "today"
  | "this-week"
  | "this-month"
  | "last-month"
  | "last-90-days"
  | "all"

export const QUICK_RANGES: Array<{ label: string; preset: QuickRange }> = [
  { label: "Today", preset: "today" },
  { label: "This Week", preset: "this-week" },
  { label: "This Month", preset: "this-month" },
  { label: "Last Month", preset: "last-month" },
  { label: "Last 90 Days", preset: "last-90-days" },
  { label: "All Time", preset: "all" },
]

export function computeQuickRange(preset: QuickRange): {
  startMs: number
  endMs: number
} {
  const now = new Date()
  switch (preset) {
    case "today": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      return { startMs: start.getTime(), endMs: start.getTime() + 86_399_999 }
    }
    case "this-week": {
      const day = now.getDay()
      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - day
      )
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      return { startMs: start.getTime(), endMs: end.getTime() }
    }
    case "this-month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      )
      return { startMs: start.getTime(), endMs: end.getTime() }
    }
    case "last-month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
        999
      )
      return { startMs: start.getTime(), endMs: end.getTime() }
    }
    case "last-90-days": {
      const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      )
      const start = new Date(end)
      start.setDate(start.getDate() - 90)
      start.setHours(0, 0, 0, 0)
      return { startMs: start.getTime(), endMs: end.getTime() }
    }
    case "all": {
      return { startMs: 0, endMs: Infinity }
    }
  }
}
