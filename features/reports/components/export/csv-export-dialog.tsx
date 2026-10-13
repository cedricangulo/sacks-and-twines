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
  truncated: boolean
  isLoading: boolean
  error: string | null
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
  truncated,
  isLoading,
  error,
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
          <ExportSubtitle isLoading={isLoading} recordCount={recordCount} />
        </DialogHeader>

        <div className="space-y-3">
          <QuickRangeButtons onSelect={applyQuickRange} />
          <DateRangeFields range={dateRange} />
        </div>

        {truncated && !isLoading ? (
          <TruncatedNotice recordCount={recordCount} />
        ) : null}

        <ExportBody
          entity={entity}
          recordCount={recordCount}
          isLoading={isLoading}
          error={error}
          columns={columns}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onDownload}
            disabled={recordCount === 0 || Boolean(error)}
          >
            Download CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Record-count line under the title: skeleton while loading, count or
// "no records" once resolved.
function ExportSubtitle({
  isLoading,
  recordCount,
}: {
  isLoading: boolean
  recordCount: number
}) {
  if (isLoading) return <Skeleton className="w-32 h-4" />
  return (
    <DialogDescription>
      {recordCount > 0
        ? `${recordCount} record${recordCount === 1 ? "" : "s"} in this range`
        : "No records found for this range."}
    </DialogDescription>
  )
}

// Warning shown when the range holds more records than one export can carry.
function TruncatedNotice({ recordCount }: { recordCount: number }) {
  return (
    <p className="type-body-small text-destructive">
      Only the first {recordCount} matching records can be exported. Older
      records exist — narrow the date range or split the export.
    </p>
  )
}

// Column picker when rows exist, error/empty message when they don't, nothing
// until an entity with a resolved count is known.
function ExportBody({
  entity,
  recordCount,
  isLoading,
  error,
  columns,
}: {
  entity: ExportEntity | null
  recordCount: number
  isLoading: boolean
  error: string | null
  columns: ColumnSelectionProps
}) {
  if (entity && recordCount > 0) {
    return <ColumnPicker entity={entity} columns={columns} />
  }
  if (entity && !isLoading) {
    return <EmptyBody error={error} />
  }
  return null
}

// Error text vs "no records" hint for a resolved-but-empty range.
function EmptyBody({ error }: { error: string | null }) {
  if (error) {
    return (
      <div className="py-4 type-body-small text-center text-destructive">
        {error}
      </div>
    )
  }
  return (
    <div className="py-4 type-body-small text-center text-muted-foreground">
      No records found for this date range. Try a wider range or use the Quick
      range buttons above.
    </div>
  )
}

// Optional-column picker grouped by section.
function ColumnPicker({
  entity,
  columns,
}: {
  entity: ExportEntity
  columns: ColumnSelectionProps
}) {
  const groups = [
    ...groupColumnsBySection(
      EXPORT_COLUMN_MAP[entity].filter((c) => !c.required)
    ),
  ]
  return (
    <div className="space-y-3 overflow-y-auto max-h-52">
      <div className="flex items-center justify-between">
        <span className="type-body-small font-medium">Columns</span>
        <Button variant="ghost" size="xs" onClick={columns.toggleAll}>
          Toggle All
        </Button>
      </div>
      {groups.map(([section, cols]) => (
        <ColumnSection
          key={section}
          section={section}
          cols={cols}
          columns={columns}
        />
      ))}
    </div>
  )
}

// One section of checkboxes inside the column picker.
function ColumnSection({
  section,
  cols,
  columns,
}: {
  section: string
  cols: Array<{ id: string; label: string; required: boolean }>
  columns: ColumnSelectionProps
}) {
  return (
    <div>
      <div className="px-1 mb-1 type-caption font-medium text-muted-foreground">
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
            <span className="type-body-small">{col.label}</span>
          </label>
        ))}
      </FieldGroup>
    </div>
  )
}
