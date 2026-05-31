"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// Props for the calendar day cell component
interface CalendarDayCellProps {
  isLoading?: boolean
  day: number
  dispatchCount: number
  adjustmentCount: number
  hasActivity: boolean
  onClick: () => void
}

// A single day cell in the calendar grid with activity badges
export function CalendarDayCell({
  day,
  dispatchCount,
  adjustmentCount,
  hasActivity,
  onClick,
  isLoading,
}: CalendarDayCellProps) {
  return (
    <Button
      type="button"
      disabled={!hasActivity || isLoading}
      className={cn(
        "relative flex h-20 flex-col items-start rounded-none justify-start gap-1 p-1 pt-7 border-b!",
        hasActivity
          ? "cursor-pointer!"
          : "cursor-not-allowed! text-muted-foreground"
      )}
      onClick={hasActivity ? onClick : undefined}
      variant="ghost"
    >
      <span className="absolute font-medium top-1 right-1">{day}</span>
      {isLoading ? (
        <div className="grid w-full gap-1">
          <Skeleton className="w-6 h-5 md:w-full" />
          <Skeleton className="w-6 h-5 md:w-full" />
        </div>
      ) : hasActivity ? (
        <div className="grid w-full gap-1">
          {dispatchCount > 0 ? (
            <Badge className="justify-start md:w-full" variant="warning">
              {dispatchCount}{" "}
              <span className="hidden md:flex">
                {dispatchCount === 1 ? "Dispatch" : "Dispatches"}
              </span>
            </Badge>
          ) : null}
          {adjustmentCount > 0 ? (
            <Badge className="justify-start md:w-full" variant="success">
              {adjustmentCount}{" "}
              <span className="hidden md:flex">
                {adjustmentCount === 1 ? "Adjustment" : "Adjustments"}
              </span>
            </Badge>
          ) : null}
        </div>
      ) : null}
    </Button>
  )
}
