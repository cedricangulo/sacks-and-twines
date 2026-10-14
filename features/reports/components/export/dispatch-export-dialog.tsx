"use client"

import type { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import type {
  DispatchExportFormat,
  DispatchRangeMode,
} from "../../hooks/use-dispatch-export"

const RANGE_MODES: Array<{ label: string; mode: DispatchRangeMode }> = [
  { label: "Day", mode: "day" },
  { label: "Week", mode: "week" },
  { label: "Month", mode: "month" },
]

interface DispatchExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  format: DispatchExportFormat
  onFormatChange: (format: DispatchExportFormat) => void
  mode: DispatchRangeMode
  onModeChange: (mode: DispatchRangeMode) => void
  range: DateRange | undefined
  onRangeChange: (range: DateRange | undefined) => void
  dispatchCount: number
  truncated: boolean
  isLargePdf: boolean
  isLoading: boolean
  isWorking: boolean
  queryFailed: boolean
  isEmpty: boolean
  error: string | null
  onExport: () => void
}

export default function DispatchExportDialog({
  open,
  onOpenChange,
  format,
  onFormatChange,
  mode,
  onModeChange,
  range,
  onRangeChange,
  dispatchCount,
  truncated,
  isLargePdf,
  isLoading,
  isWorking,
  queryFailed,
  isEmpty,
  error,
  onExport,
}: DispatchExportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Dispatches</DialogTitle>
          {isLoading ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            <DialogDescription>
              {dispatchCount > 0
                ? `${dispatchCount} dispatch${dispatchCount === 1 ? "" : "es"} in this range`
                : "No dispatches found for this range."}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-3">
          <Field orientation="horizontal">
            <FieldLabel className="w-14">Format</FieldLabel>
            <Select
              value={format}
              onValueChange={(value) =>
                onFormatChange(value as DispatchExportFormat)
              }
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Excel (.xlsx) — 2 sheets</SelectItem>
                <SelectItem value="pdf">PDF (.pdf) — grouped</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field orientation="horizontal">
            <FieldLabel className="w-14">Range</FieldLabel>
            <div className="flex flex-1 gap-1">
              {RANGE_MODES.map(({ label, mode: preset }) => (
                <Button
                  key={preset}
                  type="button"
                  variant={mode === preset ? "default" : "outline"}
                  size="xs"
                  onClick={() => onModeChange(preset)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </Field>

          <DateRangePicker
            value={range}
            onChange={onRangeChange}
            label={mode === "day" ? "Day" : mode === "week" ? "Week" : "Month"}
            numberOfMonths={1}
          />

          {truncated && !isLoading ? (
            <p className="type-body-small text-destructive">
              Only the first {dispatchCount} matching dispatches can be exported
              — pick a shorter range.
            </p>
          ) : null}
          {isLargePdf && !isLoading ? (
            <p className="type-body-small text-destructive">
              Large report — PDF generation may take up to 30 seconds. Tip:
              export by week instead.
            </p>
          ) : null}
          {error ? (
            <p className="type-body-small text-center text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onExport}
            disabled={isLoading || queryFailed || isEmpty || isWorking}
          >
            {isLoading ? "Loading data…" : isWorking ? "Exporting…" : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
