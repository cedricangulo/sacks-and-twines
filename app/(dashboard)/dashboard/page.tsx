"use client"

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
import {
  DATE_RANGE_LABELS,
  type DateRangePreset,
} from "@/features/dashboard/constants"
import { useDashboardData } from "@/features/dashboard/hooks/use-dashboard-data"
import { useDashboardDateRanges } from "@/features/dashboard/hooks/use-dashboard-date-ranges"

export default function Dashboard() {
  const {
    rangePreset,
    setRangePreset,
    startMs,
    endMs,
    velocityStartMs,
    velocityEndMs,
    tzOffsetMs,
    monthLabel,
    velocityDateRange,
  } = useDashboardDateRanges()

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
                    <SelectValue>
                      {(value) =>
                        DATE_RANGE_LABELS[value as DateRangePreset] ?? value
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(DATE_RANGE_LABELS) as DateRangePreset[]).map(
                      (preset) => (
                        <SelectItem key={preset} value={preset}>
                          {DATE_RANGE_LABELS[preset]}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              }
            />
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent>
            <h3 className="font-heading text-base font-medium">
              🚧 Product Movement 🚧
            </h3>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent>
            <DemandComparisonChart
              data={forecast}
              isLoading={forecastLoading}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
