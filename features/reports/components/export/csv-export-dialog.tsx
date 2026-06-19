"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FieldGroup } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import {
  EXPORT_COLUMN_MAP,
  EXPORT_ENTITY_NAMES,
  type ExportEntity,
  type QuickRange,
} from "../../constants"
import type { ColumnSelectionProps, DateRangeProps } from "../../types"
import { DateRangeFields } from "./date-range-fields"
import { QuickRangeButtons } from "./quick-range-buttons"

interface CsvExportDialogProps {
  open: boolean
  entity: ExportEntity | null
  dateRange: DateRangeProps
  columns: ColumnSelectionProps
  recordCount: number
  isLoading: boolean
  onOpenChange: (open: boolean) => void
  applyQuickRange: (preset: QuickRange) => void
  onDownload: () => void
}

function groupColumnsBySection(
  columns: Array<{
    id: string
    label: string
    section: string
    required: boolean
  }>
) {
  const groups = new Map<string, typeof columns>()
  for (const col of columns) {
    const existing = groups.get(col.section)
    if (existing) {
      existing.push(col)
    } else {
      groups.set(col.section, [col])
    }
  }
  return groups
}

export default function CsvExportDialog({
  open,
  entity,
  dateRange,
  columns,
  recordCount,
  isLoading,
  onOpenChange,
  applyQuickRange,
  onDownload,
}: CsvExportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Export {entity ? EXPORT_ENTITY_NAMES[entity] : ""}
          </DialogTitle>
          <DialogDescription>
            {isLoading ? (
              <Skeleton className="w-32 h-4" />
            ) : recordCount > 0 ? (
              `${recordCount} record${recordCount === 1 ? "" : "s"} in this range`
            ) : (
              "No records found for this range."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <QuickRangeButtons onSelect={applyQuickRange} />
          <DateRangeFields range={dateRange} />
        </div>

        {entity && recordCount > 0 ? (
          <div className="space-y-3 overflow-y-auto max-h-52">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Columns</span>
              <Button variant="ghost" size="xs" onClick={columns.toggleAll}>
                Toggle All
              </Button>
            </div>
            {[
              ...groupColumnsBySection(
                EXPORT_COLUMN_MAP[entity].filter((c) => !c.required)
              ),
            ].map(([section, cols]) => (
              <div key={section}>
                <div className="px-1 mb-1 text-xs font-medium text-muted-foreground">
                  {section}
                </div>
                <FieldGroup className="grid grid-cols-2 gap-2">
                  {cols.map((col) => (
                    <label
                      key={col.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={columns.selectedColumns.has(col.id)}
                        onCheckedChange={() => columns.toggleColumn(col.id)}
                        disabled={col.required}
                      />
                      <span className="text-sm">{col.label}</span>
                    </label>
                  ))}
                </FieldGroup>
              </div>
            ))}
          </div>
        ) : entity && !isLoading ? (
          <div className="py-4 text-sm text-center text-muted-foreground">
            No records found for this date range. Try a wider range or use the
            Quick range buttons above.
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onDownload} disabled={recordCount === 0}>
            Download CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
