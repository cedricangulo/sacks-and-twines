// Date range presets for the velocity heatmap selector.
export type DateRangePreset = "7d" | "30d" | "90d"

export const DATE_RANGE_LABELS: Record<DateRangePreset, string> = {
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
}

// One aggregated cell returned by the weeklyVelocity dashboard query.
export interface VelocityCell {
  dayOfWeek: number
  hour: number
  count: number
}

// Weekday labels for the velocity heatmap columns.
export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

// Business-hours labels for the velocity heatmap rows (8AM–6PM).
export const HOURS = [
  "8AM",
  "9AM",
  "10AM",
  "11AM",
  "12PM",
  "1PM",
  "2PM",
  "3PM",
  "4PM",
  "5PM",
  "6PM",
] as const

// Intensity levels on the heatmap scale, shared by cells and legend.
export const INTENSITIES = [1, 2, 3, 4, 5] as const

export type HeatmapIntensity = (typeof INTENSITIES)[number]

// Tailwind classes per intensity level, shared by heatmap cells and legend.
export const HEATMAP_INTENSITY_CLASSES: Record<HeatmapIntensity, string> = {
  1: "bg-amber-100 dark:bg-amber-950/60",
  2: "bg-amber-200 dark:bg-amber-900/60",
  3: "bg-amber-300 dark:bg-amber-800/60",
  4: "bg-amber-400 dark:bg-amber-700/60",
  5: "bg-amber-500 dark:bg-amber-600/60",
}

// ---------------------------------------------------------------------------
// Product Movement velocity classification
// ---------------------------------------------------------------------------

// Velocity tiers are relative to the best-selling product's units in the
// window, so they self-tune to any dataset. With a 1,250-unit leader these
// cutoffs (>=50% High, >=15% Medium) reproduce High/High/High/Medium/Medium
// for the fast list and all-Low for the slow list.
export const VELOCITY_HIGH_FRACTION = 0.5
export const VELOCITY_MEDIUM_FRACTION = 0.15

export type Velocity = "High" | "Medium" | "Low"

export function classifyVelocity(units: number, maxUnits: number): Velocity {
  if (maxUnits <= 0) return "Low"
  if (units >= VELOCITY_HIGH_FRACTION * maxUnits) return "High"
  if (units >= VELOCITY_MEDIUM_FRACTION * maxUnits) return "Medium"
  return "Low"
}
