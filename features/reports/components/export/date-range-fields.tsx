"use client"

import { DatePicker } from "@/components/ui/date-picker"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { DateRangeProps } from "../../types"

export function DateRangeFields({ range }: { range: DateRangeProps }) {
  return (
    <div className="space-y-2">
      <Field orientation="horizontal">
        <FieldLabel className="w-12 type-caption">Start</FieldLabel>
        <div className="flex items-center gap-2">
          <DatePicker
            value={range.startDate}
            onChange={range.setStartDate}
            placeholder="Start date"
          />
          <Input
            type="time"
            value={range.startTime}
            onChange={(e) => range.setStartTime(e.target.value)}
            className="w-28 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          />
        </div>
      </Field>
      <Field orientation="horizontal">
        <FieldLabel className="w-12 type-caption">End</FieldLabel>
        <div className="flex items-center gap-2">
          <DatePicker
            value={range.endDate}
            onChange={range.setEndDate}
            placeholder="End date"
          />
          <Input
            type="time"
            value={range.endTime}
            onChange={(e) => range.setEndTime(e.target.value)}
            className="w-28 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          />
        </div>
      </Field>
    </div>
  )
}
