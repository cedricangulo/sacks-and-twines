"use client"

import { useMemo } from "react"
import { Grid } from "@/components/charts/grid"
import { Line } from "@/components/charts/line"
import { LineChart } from "@/components/charts/line-chart"
import { ChartTooltip } from "@/components/charts/tooltip"
import { XAxis } from "@/components/charts/x-axis"
import { Skeleton } from "@/components/ui/skeleton"

interface MonthlyDispatchChartProps {
  data: Array<{ day: number; value: number; dispatchCount: number }>
  monthLabel: string
  isLoading: boolean
}

export default function MonthlyDispatchChart({
  data,
  monthLabel,
  isLoading,
}: MonthlyDispatchChartProps) {
  const now = useMemo(() => new Date(), [])
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        date: new Date(now.getFullYear(), now.getMonth(), d.day),
        value: d.value,
        dispatchCount: d.dispatchCount,
      })),
    [data, now]
  )

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading text-base font-medium">
            Monthly Dispatch Graph
          </h3>
          <p className="text-sm text-muted-foreground">{monthLabel}</p>
        </div>
        <span className="text-sm text-muted-foreground">Units</span>
      </div>
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : chartData.length > 0 ? (
        <LineChart
          data={chartData}
          xDataKey="date"
          aspectRatio="2 / 1"
          status="ready"
        >
          <Grid
            horizontal
            vertical={false}
            strokeDasharray="4,4"
            numTicksRows={5}
          />
          <Line
            dataKey="dispatchCount"
            yAxisId="right"
            stroke="var(--chart-line-secondary)"
            strokeWidth={2.5}
          />
          <Line
            dataKey="value"
            stroke="var(--chart-line-primary)"
            strokeWidth={2.5}
          />
          <XAxis numTicks={7} tickMode="domain" />
          <ChartTooltip
            rows={(point) => {
              const p = point as Record<string, unknown>
              return [
                {
                  color: "var(--chart-line-secondary)",
                  label: "Dispatches",
                  value: String(p.dispatchCount ?? ""),
                },
                {
                  color: "var(--chart-line-primary)",
                  label: "Units",
                  value: String(p.value ?? ""),
                },
              ]
            }}
          />
        </LineChart>
      ) : (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          No dispatch data for this month
        </div>
      )}
    </div>
  )
}
