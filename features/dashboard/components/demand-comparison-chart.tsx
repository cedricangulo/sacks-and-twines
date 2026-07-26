"use client"

import { Bar } from "@/components/charts/bar"
import { BarChart } from "@/components/charts/bar-chart"
import { ChartTooltip } from "@/components/charts/tooltip"
import { Skeleton } from "@/components/ui/skeleton"

interface DemandComparisonChartProps {
  data: Array<{ weekLabel: string; actual: number; predicted: number }>
  isLoading: boolean
}

export default function DemandComparisonChart({
  data,
  isLoading,
}: DemandComparisonChartProps) {
  const chartData = data.map((week) => ({
    week: week.weekLabel,
    actual: week.actual,
    predicted: week.predicted,
  }))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading text-base font-medium">
            Predictive vs. Actual Demand
          </h3>
          <p className="text-sm text-muted-foreground">Weekly breakdown</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-foreground" />
            <span className="text-xs text-muted-foreground">Actual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-primary" />
            <span className="text-xs text-muted-foreground">Predicted</span>
          </div>
        </div>
      </div>
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : chartData.length > 0 ? (
        <BarChart
          data={chartData}
          xDataKey="week"
          aspectRatio="2 / 1"
          orientation="vertical"
        >
          <Bar dataKey="actual" fill="var(--foreground)" lineCap="round" />
          <Bar dataKey="predicted" fill="var(--primary)" lineCap="round" />
          <ChartTooltip />
        </BarChart>
      ) : (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          No demand data available
        </div>
      )}
    </div>
  )
}
