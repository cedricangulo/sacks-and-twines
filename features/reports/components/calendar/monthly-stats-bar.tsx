"use client"

import {
  ArrowsClockwiseIcon,
  ClipboardTextIcon,
  PackageIcon,
  TrendUpIcon,
  WarningIcon,
} from "@phosphor-icons/react"
import type { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCompact, formatCurrency } from "@/lib/formatters"
import { cn } from "@/lib/utils"
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
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4 md:gap-x-3 md:gap-y-0 md:divide-x md:divide-border md:[&>*:not(:first-child)]:pl-4">
          <StatItem
            icon={
              <ClipboardTextIcon
                weight="fill"
                className="size-5 text-yellow-600 md:size-6 dark:text-yellow-400"
              />
            }
            label="Dispatches"
            tone="bg-yellow-100 dark:bg-yellow-950"
            value={formatCompact(data.dispatchCount)}
            isLoading={isLoading}
          />

          <StatItem
            icon={
              <ArrowsClockwiseIcon
                weight="fill"
                className="size-5 text-emerald-600 md:size-6 dark:text-emerald-400"
              />
            }
            label="Adjustments"
            tone="bg-emerald-100 dark:bg-emerald-950"
            value={formatCompact(data.adjustmentCount)}
            isLoading={isLoading}
          />

          <StatItem
            icon={
              <PackageIcon
                weight="fill"
                className="size-5 text-primary md:size-6"
              />
            }
            label="Items Out"
            tone="bg-primary/10"
            value={formatCompact(data.totalItems)}
            isLoading={isLoading}
          />

          <StatItem
            icon={
              <TrendUpIcon
                weight="fill"
                className="size-5 text-destructive md:size-6"
              />
            }
            label="Dispatch Value"
            tone="bg-destructive/10"
            value={
              data.totalValue === null ? (
                <span className="text-muted-foreground">&mdash;</span>
              ) : (
                formatCurrency(data.totalValue, {
                  notation: "compact",
                  maximumFractionDigits: 1,
                })
              )
            }
            isLoading={isLoading}
          />
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

// One stat block. Stacked on phones (icon above value + label) so the 31px
// figure never has to share a ~130px column with the icon and label, then
// collapses back to the desktop icon | value | label row at `md`.
function StatItem({
  icon,
  label,
  tone,
  value,
  isLoading,
}: {
  icon: ReactNode
  label: string
  tone: string
  value: ReactNode
  isLoading: boolean
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-end md:gap-3">
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl md:size-10",
          tone
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        {isLoading ? (
          <Skeleton className="w-24 h-9 md:w-20" />
        ) : (
          <div className="font-mono type-h2 tabular-nums">{value}</div>
        )}
        <div className="type-body-small text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}
