"use client"

import {
  ArrowsClockwiseIcon,
  ClipboardTextIcon,
  PackageIcon,
  TrendUpIcon,
  WarningIcon,
} from "@phosphor-icons/react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCompact, formatCurrency } from "@/lib/formatters"
import { getStatsRange } from "../../constants"
import { useReportFiltersContext } from "../../hooks/report-filters-context"
import { useMonthlyAggregates } from "../../hooks/use-monthly-aggregates"

// Monthly summary stats bar, scoped to the browsed month or selected day.
//
// There is deliberately no month/year/all-time toggle here. Those wider ranges
// are computed by summing every dispatch document in the period, so at this
// table's size a year or all-time range exceeds the server's per-query read
// ceiling and can only ever be answered with partial totals. Offering a control
// that can never produce complete figures is worse than not offering it.
//
// Restoring them needs `reports.queries.monthlyAggregates` to read pre-computed
// rollups instead of scanning dispatches — see docs/PERFORMANCE-AUDIT.md P11.
// The export dialogs keep their own range presets and surface their own
// truncation notices.
export default function MonthlyStatsBar() {
  const {
    monthStartMs,
    monthEndMs,
    selectedDay,
    selectedDayStartMs,
    selectedDayEndMs,
    // formattedDate,
  } = useReportFiltersContext()

  const hasDaySelected = selectedDay !== null

  const statsArgs = getStatsRange({
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
            ) : data.totalValue === null ? (
              <div className="font-mono type-h2 tabular-nums text-muted-foreground">
                &mdash;
              </div>
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

        {data.truncated ? (
          <p className="type-body-small text-muted-foreground flex items-start gap-2">
            <WarningIcon
              weight="fill"
              className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400"
            />
            <span>
              {hasDaySelected
                ? "There's more activity on this day than we can add up in one go, so these numbers are incomplete."
                : "This month has more activity than we can add up in one go, so these numbers are incomplete."}{" "}
              Try a shorter date range for the full picture.
            </span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
