"use client"
import { CalendarIcon } from "@phosphor-icons/react";
import * as React from "react"
import type { DayPicker } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatDate } from "@/lib/formatters/date"
import { cn } from "@/lib/utils"

type DatePickerProps = {
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  fromDate?: Date
  toDate?: Date
  captionLayout?: Exclude<
    React.ComponentProps<typeof DayPicker>["captionLayout"],
    boolean | undefined
  >
}

function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  fromDate,
  toDate,
  captionLayout = "dropdown",
}: DatePickerProps) {
  const disabledDays = React.useMemo(() => {
    const matchers: Array<{ before: Date } | { after: Date }> = []
    if (fromDate) matchers.push({ before: fromDate })
    if (toDate) matchers.push({ after: toDate })
    return matchers
  }, [fromDate, toDate])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          disabled={disabled}
          className={cn(
            "justify-start gap-2 font-normal",
            !value ? "text-muted-foreground" : ""
          )}
        >
          <CalendarIcon weight="fill" />
          {value
            ? formatDate(value, {
                year: "numeric",
                month: "short",
                day: "numeric",
                locale: "en-PH",
              })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          captionLayout={captionLayout}
          disabled={disabledDays.length > 0 ? disabledDays : undefined}
          startMonth={fromDate}
          endMonth={toDate}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
