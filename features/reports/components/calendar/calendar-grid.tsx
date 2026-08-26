"use client"

import {
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CaretUpIcon,
} from "@phosphor-icons/react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group"
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { DAY_NAMES, MONTH_NAMES } from "../../constants"
import { useReportFiltersContext } from "../../hooks/report-filters-context"
import { useCalendarDays } from "../../hooks/use-calendar-days"
import { useCalendarSummary } from "../../hooks/use-calendar-summary"
import { CalendarDayCell } from "./calendar-day-cell"

/** Calendar grid for the selected month — renders year/month pickers + day cells with activity badges. */
export default function CalendarGrid() {
  const {
    month,
    year,
    currentMonth,
    currentYear,
    monthStartMs,
    monthEndMs,
    goPrevMonth,
    goNextMonth,
    selectDay,
    selectedDay,
    setMonthValue,
    setYearValue,
  } = useReportFiltersContext()

  const { summary, isLoading } = useCalendarSummary(monthStartMs, monthEndMs)
  const { days, firstDayOfWeek, prevMonthDays } = useCalendarDays(
    month,
    year,
    summary
  )

  const [calendarVisible, setCalendarVisible] = useState(true)

  // Derived from `currentYear` (via `useReportFilters`) so the list updates
  // when the year rolls over without a reload. Fixes `no-impure-call-at-module-scope`.
  const yearOptions = useMemo(
    () =>
      Array.from({ length: currentYear - 1950 + 1 }, (_, i) =>
        String(1950 + i)
      ),
    [currentYear]
  )

  const availableMonths = useMemo(() => {
    if (year < currentYear) return MONTH_NAMES
    return MONTH_NAMES.slice(0, currentMonth + 1)
  }, [year, currentYear, currentMonth])

  const emptyCellsBefore = Array.from({ length: firstDayOfWeek }, (_, i) => i)

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <ButtonGroup>
          <Combobox
            items={availableMonths}
            value={MONTH_NAMES[month]}
            onValueChange={(value) => {
              const idx = MONTH_NAMES.indexOf(
                value as (typeof MONTH_NAMES)[number]
              )
              if (idx !== -1) setMonthValue(idx)
            }}
          >
            <ComboboxInput placeholder="Select month" className="w-32" />
            <ComboboxContent>
              <ComboboxList>
                {(item) => (
                  <ComboboxItem key={item} value={item}>
                    {item}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          <ButtonGroupSeparator />
          <Combobox
            items={yearOptions}
            value={String(year)}
            onValueChange={(value) => {
              const y = Number(value)
              if (!Number.isNaN(y)) setYearValue(y)
            }}
          >
            <ComboboxInput placeholder="Select year" className="w-22" />
            <ComboboxContent>
              <ComboboxList>
                {(item) => (
                  <ComboboxItem key={item} value={item}>
                    {item}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </ButtonGroup>
        <div className="flex items-center gap-2">
          <Button
            aria-label={calendarVisible ? "Hide calendar" : "Show calendar"}
            aria-expanded={calendarVisible}
            disabled={selectedDay === null}
            onClick={() => setCalendarVisible((v) => !v)}
            variant="secondary"
          >
            {calendarVisible ? (
              <CaretUpIcon weight="fill" />
            ) : (
              <CaretDownIcon weight="fill" />
            )}
            {calendarVisible ? "Hide calendar" : "Show calendar"}
          </Button>
          <Button
            aria-label="Previous month"
            onClick={goPrevMonth}
            size="icon"
            variant="outline"
          >
            <CaretLeftIcon weight="fill" />
          </Button>
          <Button
            aria-label="Next month"
            disabled={
              isLoading || (year === currentYear && month === currentMonth)
            }
            onClick={goNextMonth}
            size="icon"
            variant="outline"
          >
            <CaretRightIcon weight="fill" />
          </Button>
        </div>
      </div>

      <div
        className="grid transition-[grid-template-rows] duration-200"
        style={{ gridTemplateRows: calendarVisible ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden min-h-0">
          <div className="grid grid-cols-7">
            {DAY_NAMES.map((name) => (
              <div
                key={name}
                className="py-2 type-body-small font-medium text-center border-b text-muted-foreground"
              >
                {name}
              </div>
            ))}

            {emptyCellsBefore.map((i) => {
              const prevDay = prevMonthDays - emptyCellsBefore.length + i + 1
              return (
                <div
                  key={`prev-${prevDay}`}
                  className="flex items-start justify-end h-16 p-1 type-body-small text-muted-foreground/50"
                >
                  {prevDay}
                </div>
              )
            })}

            {days.map((dayInfo) => (
              <CalendarDayCell
                key={dayInfo.day}
                day={dayInfo.day}
                isLoading={isLoading}
                isSelected={selectedDay === dayInfo.day}
                dispatchCount={dayInfo.dispatchCount}
                adjustmentCount={dayInfo.adjustmentCount}
                hasActivity={dayInfo.hasActivity}
                onClick={() => selectDay(dayInfo.day)}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
