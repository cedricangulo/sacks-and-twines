"use client"

import { CalendarIcon } from "@phosphor-icons/react"
import * as React from "react"
import type { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatDate } from "@/lib/formatters/date"
import { cn } from "@/lib/utils"

interface DateRangePickerProps {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  label?: string
  placeholder?: string
  numberOfMonths?: number
}

function formatShort(date: Date): string {
  return formatDate(date, {
    year: "numeric",
    month: "short",
    day: "numeric",
    locale: "en-PH",
  })
}

// Date-only range picker (no time inputs — Day/Week/Month ranges always span
// full days, resolved to 00:00 → 23:59:59.999 in the export hook).
export function DateRangePicker({
  value,
  onChange,
  label = "Range",
  placeholder = "Pick a date range",
  numberOfMonths = 2,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className={cn(
                "justify-start px-2.5 font-normal",
                !value?.from && "text-muted-foreground"
              )}
            />
          }
        >
          <CalendarIcon data-icon="inline-start" />
          {value?.from ? (
            value.to ? (
              <>
                {formatShort(value.from)} - {formatShort(value.to)}
              </>
            ) : (
              formatShort(value.from)
            )
          ) : (
            <span>{placeholder}</span>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={(range) => {
              onChange(range)
              if (range?.from && range?.to) setOpen(false)
            }}
            numberOfMonths={numberOfMonths}
          />
        </PopoverContent>
      </Popover>
    </Field>
  )
}
