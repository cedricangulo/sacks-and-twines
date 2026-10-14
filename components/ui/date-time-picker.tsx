"use client"

import { useIsMobile } from "@/hooks/use-mobile"
import { nowTimeString } from "@/lib/form-primitives"
import { DatePicker } from "./date-picker"
import { Field, FieldContent, FieldError, FieldLabel } from "./field"
import { Input } from "./input"

// Business-time ("when it happened") picker shared by the stock-in, dispatch
// and adjustment forms. Empty means "now" — the mutation stamps `Date.now()`.
// Picking a date with an empty time auto-fills the current clock time, so a
// backdated entry keeps intra-day ordering instead of collapsing to midnight.
//
// Mobile renders native date/time inputs (OS pickers, no popover clipping in
// sheets and dialogs). Desktop renders the popover calendar + time input.
// Both branches read and write the same `{ date, time }` pair, so rotating
// across the breakpoint or re-rendering drops no data.
export type DateTimeValue = {
  date: Date | undefined
  time: string
}

type DateTimePickerProps = {
  idPrefix: string
  label: string
  value: DateTimeValue
  onChange: (value: DateTimeValue) => void
  error?: string
  hint?: string
  disabled?: boolean
}

// Local YYYY-MM-DD for the native date input (avoids the UTC-parse day shift
// of `new Date("2025-11-12")`, which is UTC midnight, in PH time).
function toDateInputValue(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")
}

function parseDateInputValue(value: string): Date | undefined {
  if (!value) return undefined
  const ms = new Date(`${value}T00:00:00`).getTime()
  return Number.isFinite(ms) ? new Date(ms) : undefined
}

export function DateTimePicker({
  idPrefix,
  label,
  value,
  onChange,
  error,
  hint,
  disabled = false,
}: DateTimePickerProps) {
  const isMobile = useIsMobile()
  const { date, time } = value
  const today = toDateInputValue(new Date())

  const handleDateChange = (next: Date | undefined) => {
    // Auto-default: a newly picked date with an empty time takes the current
    // clock time. Clearing the date clears the time — time without a date is
    // meaningless and would otherwise linger invisibly.
    if (next && !time) {
      onChange({ date: next, time: nowTimeString() })
    } else if (!next) {
      onChange({ date: undefined, time: "" })
    } else {
      onChange({ date: next, time })
    }
  }

  const dateId = `${idPrefix}-date`
  const timeId = `${idPrefix}-time`

  return (
    <Field data-invalid={!!error}>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={dateId}>{label}</FieldLabel>
        <span className="type-caption text-muted-foreground">Optional</span>
      </div>
      <FieldContent>
        {isMobile ? (
          <div className="flex gap-2">
            <Input
              id={dateId}
              type="date"
              className="min-w-0 flex-1"
              value={date ? toDateInputValue(date) : ""}
              max={today}
              disabled={disabled}
              aria-invalid={!!error}
              onChange={(e) => handleDateChange(parseDateInputValue(e.target.value))}
            />
            <Input
              id={timeId}
              type="time"
              className="w-32 shrink-0"
              value={time}
              disabled={disabled || !date}
              aria-invalid={!!error}
              onChange={(e) => onChange({ date, time: e.target.value })}
            />
          </div>
        ) : (
          <div className="flex gap-2">
            <DatePicker
              value={date}
              onChange={handleDateChange}
              placeholder="Today"
              disabled={disabled}
              toDate={new Date()}
            />
            <Input
              id={timeId}
              type="time"
              className="w-32 shrink-0"
              value={time}
              disabled={disabled || !date}
              aria-invalid={!!error}
              onChange={(e) => onChange({ date, time: e.target.value })}
            />
          </div>
        )}
      </FieldContent>
      {error ? (
        <FieldError>{error}</FieldError>
      ) : hint ? (
        <p className="type-body-small text-muted-foreground">{hint}</p>
      ) : null}
    </Field>
  )
}
