"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import HeatmapLegend from "./heatmap-legend"

interface VelocityCell {
  dayOfWeek: number
  hour: number
  count: number
}

interface WeeklyVelocityHeatmapProps {
  data: VelocityCell[]
  isLoading: boolean
  dateRange?: string
  headerAction?: React.ReactNode
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const HOURS = [
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
]

function getIntensity(count: number, maxCount: number): number {
  if (maxCount === 0 || count === 0) return 0
  return Math.ceil((count / maxCount) * 5)
}

const intensityClass: Record<number, string> = {
  0: "bg-muted/30",
  1: "bg-amber-100 dark:bg-amber-950/60",
  2: "bg-amber-200 dark:bg-amber-900/60",
  3: "bg-amber-300 dark:bg-amber-800/60",
  4: "bg-amber-400 dark:bg-amber-700/60",
  5: "bg-amber-500 dark:bg-amber-600/60",
}

export default function WeeklyVelocityHeatmap({
  data,
  isLoading,
  dateRange,
  headerAction,
}: WeeklyVelocityHeatmapProps) {
  const grid = useMemo(() => {
    const lookup = new Map<string, number>()
    for (const cell of data) {
      const key = `${cell.dayOfWeek}-${cell.hour}`
      lookup.set(key, cell.count)
    }

    const allCounts = data.map((c) => c.count)
    const max = allCounts.length > 0 ? Math.max(...allCounts) : 0

    return HOURS.map((_, hourIdx) => {
      const displayHour = hourIdx + 8
      return DAYS.map((_, dayIdx) => {
        const key = `${dayIdx}-${displayHour}`
        const count = lookup.get(key) ?? 0
        return { count, intensity: getIntensity(count, max) }
      })
    })
  }, [data])

  return (
    // TODO use type class for typography
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-medium font-heading">
            Weekly Dispatch Velocity
          </h3>
          <p className="text-sm text-muted-foreground">
            {dateRange ?? "Peak activity across all transactions"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {headerAction}
          <HeatmapLegend />
        </div>
      </div>
      <div className="overflow-x-auto">
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: "3rem repeat(7, 1fr)",
          }}
        >
          <div />
          {DAYS.map((day) => (
            <div
              key={day}
              className="text-xs text-center text-muted-foreground"
            >
              {day}
            </div>
          ))}
          {grid.flatMap((row, hourIdx) => [
            <div
              key={`lbl-${hourIdx}`}
              className="flex items-center justify-end pr-1.5 text-xs text-muted-foreground"
            >
              {HOURS[hourIdx]}
            </div>,
            ...row.map((cell, dayIdx) => (
              <div
                key={`${hourIdx}-${dayIdx}`}
                className={cn(
                  "h-6 rounded-md animate-fade-in",
                  isLoading
                    ? "animate-pulse bg-muted"
                    : intensityClass[cell.intensity]
                )}
                title={
                  isLoading
                    ? undefined
                    : `${DAYS[dayIdx]} ${HOURS[hourIdx]}: ${cell.count} dispatch${cell.count !== 1 ? "es" : ""}`
                }
              />
            )),
          ])}
        </div>
      </div>
    </div>
  )
}
