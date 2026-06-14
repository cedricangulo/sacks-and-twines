import type { ExportEntity } from "./constants"

export interface DateRangeProps {
  startDate: Date | undefined
  setStartDate: (d: Date | undefined) => void
  endDate: Date | undefined
  setEndDate: (d: Date | undefined) => void
  startTime: string
  setStartTime: (t: string) => void
  endTime: string
  setEndTime: (t: string) => void
}

export interface ColumnSelectionProps {
  entity: ExportEntity
  selectedColumns: Set<string>
  toggleColumn: (id: string) => void
  toggleAll: () => void
}

export interface PdfSummaryProps {
  summaryLines: string[]
  isEmpty: boolean
}
