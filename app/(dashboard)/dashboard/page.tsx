"use client"

import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import DemandComparisonChart from "@/features/dashboard/components/demand-comparison-chart"
import MonthlyDispatchChart from "@/features/dashboard/components/monthly-dispatch-chart"
import StatCards from "@/features/dashboard/components/stat-cards"
import WeeklyVelocityHeatmap from "@/features/dashboard/components/weekly-velocity-heatmap"
import { useDashboardData } from "@/features/dashboard/hooks/use-dashboard-data"
import { MONTH_NAMES } from "@/features/reports/constants"

type DateRangePreset = "7d" | "30d" | "90d" | "6m" | "all"

export default function Dashboard() {
  const now = useMemo(() => new Date(), [])
  const [rangePreset, setRangePreset] = useState<DateRangePreset>("6m")
  const startMs = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
    [now]
  )
  const endMs = useMemo(
    () =>
      new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      ).getTime(),
    [now]
  )
  const nowTs = now.getTime()
  const velocityStartMs = useMemo(() => {
    switch (rangePreset) {
      case "7d":
        return nowTs - 7 * 24 * 60 * 60 * 1000
      case "30d":
        return nowTs - 30 * 24 * 60 * 60 * 1000
      case "90d":
        return nowTs - 90 * 24 * 60 * 60 * 1000
      case "6m": {
        const d = new Date(nowTs)
        d.setMonth(d.getMonth() - 6)
        return d.getTime()
      }
      case "all":
        return 0
    }
  }, [nowTs, rangePreset])
  const velocityEndMs = nowTs

  const monthLabel = `${MONTH_NAMES[now.getMonth()]} · Outgoing stock volume`
  const tzOffsetMs = useMemo(
    () => new Date().getTimezoneOffset() * -60 * 1000,
    []
  )
  const velocityDateRange = useMemo(() => {
    if (rangePreset === "all") return "All dispatches"
    const fmt = (ms: number) => {
      const d = new Date(ms)
      return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    }
    return `${fmt(velocityStartMs)} – ${fmt(velocityEndMs)}, ${new Date(velocityEndMs).getFullYear()}`
  }, [velocityStartMs, velocityEndMs, rangePreset])

  const {
    stats,
    statsLoading,
    dispatchVolume,
    dispatchLoading,
    velocity,
    velocityLoading,
    forecast,
    forecastLoading,
  } = useDashboardData(
    startMs,
    endMs,
    velocityStartMs,
    velocityEndMs,
    tzOffsetMs
  )

  return (
    <div className="space-y-6">
      <StatCards
        totalAssetValue={stats?.totalAssetValue}
        activeProductCount={stats?.activeProductCount}
        categoryCount={stats?.categoryCount}
        stockAlerts={stats?.stockAlerts}
        isLoading={statsLoading}
      />

      <div className="grid grid-cols-1 h-fit gap-6 lg:grid-cols-2">
        <Card size="sm">
          <CardContent>
            <MonthlyDispatchChart
              data={dispatchVolume}
              monthLabel={monthLabel}
              isLoading={dispatchLoading}
            />
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent>
            <WeeklyVelocityHeatmap
              data={velocity}
              isLoading={velocityLoading}
              dateRange={velocityDateRange}
              headerAction={
                <Select
                  value={rangePreset}
                  onValueChange={(v) => setRangePreset(v as DateRangePreset)}
                >
                  <SelectTrigger size="sm">
                    <SelectValue className="capitalize" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="6m">Last 6 months</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
          </CardContent>
        </Card>
      </div>

      <Card size="sm">
        <CardContent>
          <DemandComparisonChart data={forecast} isLoading={forecastLoading} />
        </CardContent>
      </Card>
    </div>
  )
}
