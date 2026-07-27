"use client"

import {
  ArrowsClockwiseIcon,
  ClipboardTextIcon,
  PackageIcon,
  TrendUpIcon,
} from "@phosphor-icons/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCompact, formatCurrency } from "@/lib/formatters"
import { getStatsRange } from "../../constants"
import { useReportFiltersContext } from "../../hooks/report-filters-context"
import { useMonthlyAggregates } from "../../hooks/use-monthly-aggregates"

// Monthly summary stats bar with time range filter
export default function MonthlyStatsBar() {
  const {
    year,
    monthStartMs,
    monthEndMs,
    selectedDay,
    selectedDayStartMs,
    selectedDayEndMs,
    formattedDate,
  } = useReportFiltersContext()

  const [range, setRange] = useState<"month" | "year" | "all">("month")

  const hasDaySelected = selectedDay !== null

  const statsArgs = getStatsRange(range, {
    year,
    monthStartMs,
    monthEndMs,
    selectedDayStartMs,
    selectedDayEndMs,
  })

  const { data, isLoading } = useMonthlyAggregates(
    statsArgs.startMs,
    statsArgs.endMs
  )

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 divide-y md:grid-cols-4 md:divide-y-0 md:divide-x divide-border">
          <div className="flex items-end gap-3">
            <div className="p-2 bg-yellow-100 rounded-xl dark:bg-yellow-950">
              <ClipboardTextIcon
                weight="fill"
                className="text-yellow-600 size-6 dark:text-yellow-400"
              />
            </div>
            {isLoading ? (
              <Skeleton className="w-20 h-9" />
            ) : (
              <div className="font-mono type-h2 tabular-nums">
                {formatCompact(data.dispatchCount)}
              </div>
            )}
            <div className="type-body-small text-muted-foreground">
              Dispatches
            </div>
          </div>

          <div className="flex items-end gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950">
              <ArrowsClockwiseIcon
                weight="fill"
                className="size-6 text-emerald-600 dark:text-emerald-400"
              />
            </div>
            {isLoading ? (
              <Skeleton className="w-20 h-9" />
            ) : (
              <div className="font-mono type-h2 tabular-nums">
                {formatCompact(data.adjustmentCount)}
              </div>
            )}
            <div className="type-body-small text-muted-foreground">
              Adjustments
            </div>
          </div>

          <div className="flex items-end gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <PackageIcon weight="fill" className="size-6 text-primary" />
            </div>
            {isLoading ? (
              <Skeleton className="w-20 h-9" />
            ) : (
              <div className="font-mono type-h2 tabular-nums">
                {formatCompact(data.totalItems)}
              </div>
            )}
            <div className="type-body-small text-muted-foreground">
              Items Out
            </div>
          </div>

          <div className="flex items-end gap-3">
            <div className="p-2 rounded-xl bg-destructive/10">
              <TrendUpIcon weight="fill" className="size-6 text-destructive" />
            </div>
            {isLoading ? (
              <Skeleton className="w-20 h-9" />
            ) : (
              <div className="font-mono type-h2 tabular-nums">
                {formatCurrency(data.totalValue, {
                  notation: "compact",
                  maximumFractionDigits: 1,
                })}
              </div>
            )}
            <div className="type-body-small text-muted-foreground">
              Dispatch Value
            </div>
          </div>
        </div>

        <div className="border-t" />

        {hasDaySelected ? (
          <div className="font-medium type-body-small text-muted-foreground">
            {formattedDate}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={range === "month" ? "secondary" : "outline"}
              onClick={() => setRange("month")}
            >
              This Month
            </Button>
            <Button
              size="sm"
              variant={range === "year" ? "secondary" : "outline"}
              onClick={() => setRange("year")}
            >
              This Year
            </Button>
            <Button
              size="sm"
              variant={range === "all" ? "secondary" : "outline"}
              onClick={() => setRange("all")}
            >
              All Time
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
