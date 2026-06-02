export type TimeRange = "month" | "year" | "all"

/** Number of items per page in detail panel tables. */
export const ITEMS_PER_PAGE = 20

/** Month names for calendar display. */
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

/** Day names for calendar header. */
export const DAY_NAMES = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const

/** Computes start/end timestamps for the stats bar based on range and selection state. */
export function getStatsRange(
  range: TimeRange,
  filters: {
    year: number
    monthStartMs: number
    monthEndMs: number
    selectedDayStartMs: number | null
    selectedDayEndMs: number | null
  }
): { startMs: number; endMs: number } {
  if (filters.selectedDayStartMs !== null && filters.selectedDayEndMs !== null) {
    return { startMs: filters.selectedDayStartMs, endMs: filters.selectedDayEndMs }
  }
  switch (range) {
    case "month":
      return { startMs: filters.monthStartMs, endMs: filters.monthEndMs }
    case "year":
      return {
        startMs: new Date(filters.year, 0, 1).getTime(),
        endMs: new Date(filters.year, 11, 31, 23, 59, 59, 999).getTime(),
      }
    case "all":
      return { startMs: 0, endMs: Infinity }
  }
}
