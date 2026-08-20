"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import {
  DAYS,
  HEATMAP_INTENSITY_CLASSES,
  HOURS,
  type VelocityCell,
} from "../constants"
import HeatmapLegend from "./heatmap-legend"

interface WeeklyVelocityHeatmapProps {
  data: VelocityCell[]
  isLoading: boolean
  dateRange?: string
  headerAction?: React.ReactNode
}

const CELL_INTENSITY_CLASSES: Record<number, string> = {
  0: "bg-muted/30",
  ...HEATMAP_INTENSITY_CLASSES,
}

function getIntensity(count: number, maxCount: number): number {
  if (maxCount === 0 || count === 0) return 0
  return Math.ceil((count / maxCount) * 5)
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
        {headerAction}
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
                    : CELL_INTENSITY_CLASSES[cell.intensity]
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
      <div className="flex justify-center w-full">
        <HeatmapLegend />
      </div>
    </div>
  )
}
