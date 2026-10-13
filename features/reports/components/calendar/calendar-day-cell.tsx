"use client"

import { memo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// Props for the calendar day cell component
interface CalendarDayCellProps {
  day: number
  dispatchCount: number
  adjustmentCount: number
  hasActivity: boolean
  onClick: () => void
  isSelected?: boolean
  isLoading?: boolean
}

// A single day cell in the calendar grid with activity badges
const CalendarDayCellImpl = ({
  day,
  dispatchCount,
  adjustmentCount,
  hasActivity,
  onClick,
  isSelected,
  isLoading,
}: CalendarDayCellProps) => {
  return (
    <Button
      type="button"
      disabled={!hasActivity || isLoading}
      className={cn(
        "relative flex h-20 flex-col items-start rounded-none justify-start gap-1 p-1 pt-7",
        hasActivity
          ? "cursor-pointer!"
          : "cursor-not-allowed! text-muted-foreground",
        isSelected ? "bg-primary/30" : ""
      )}
      onClick={hasActivity ? onClick : undefined}
      variant="ghost"
    >
      <span className="absolute font-medium top-1 right-1">{day}</span>
      <DayCellBody
        isLoading={isLoading}
        hasActivity={hasActivity}
        dispatchCount={dispatchCount}
        adjustmentCount={adjustmentCount}
      />
    </Button>
  )
}

// Loading placeholder vs activity badges vs empty. Split out so the cell
// itself stays a flat layout with no nested branches.
function DayCellBody({
  isLoading,
  hasActivity,
  dispatchCount,
  adjustmentCount,
}: {
  isLoading?: boolean
  hasActivity: boolean
  dispatchCount: number
  adjustmentCount: number
}) {
  if (isLoading) {
    return (
      <div className="grid w-full gap-1">
        <Skeleton className="w-6 h-5 md:w-full" />
        <Skeleton className="w-6 h-5 md:w-full" />
      </div>
    )
  }
  if (!hasActivity) return null
  return (
    <div className="grid w-full gap-1">
      <ActivityBadge
        count={dispatchCount}
        singular="Dispatch"
        plural="Dispatches"
        variant="warning"
      />
      <ActivityBadge
        count={adjustmentCount}
        singular="Adjustment"
        plural="Adjustments"
        variant="success"
      />
    </div>
  )
}

// One activity badge, hidden when its count is zero.
function ActivityBadge({
  count,
  singular,
  plural,
  variant,
}: {
  count: number
  singular: string
  plural: string
  variant: "warning" | "success"
}) {
  if (count <= 0) return null
  return (
    <Badge className="justify-start md:w-full" variant={variant}>
      {count}{" "}
      <span className="hidden md:flex">{count === 1 ? singular : plural}</span>
    </Badge>
  )
}

// Memoized version of the CalendarDayCell to prevent unnecessary re-renders
export const CalendarDayCell = memo(
  CalendarDayCellImpl,
  (prev, next) =>
    prev.day === next.day &&
    prev.dispatchCount === next.dispatchCount &&
    prev.adjustmentCount === next.adjustmentCount &&
    prev.hasActivity === next.hasActivity &&
    prev.isSelected === next.isSelected &&
    prev.isLoading === next.isLoading
)
