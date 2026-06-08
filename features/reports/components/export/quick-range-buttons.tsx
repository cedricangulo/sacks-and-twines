"use client"

import { Button } from "@/components/ui/button"
import { QUICK_RANGES, type QuickRange } from "../../constants"

export function QuickRangeButtons({
  onSelect,
}: {
  onSelect: (preset: QuickRange) => void
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {QUICK_RANGES.map(({ label, preset }) => (
        <Button
          key={preset}
          onClick={() => onSelect(preset)}
          variant="outline"
          size="xs"
        >
          {label}
        </Button>
      ))}
    </div>
  )
}
