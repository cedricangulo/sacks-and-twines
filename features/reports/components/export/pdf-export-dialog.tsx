"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { type QuickRange } from "../../constants"
import type { DateRangeProps, PdfSummaryProps } from "../../types"
import { DateRangeFields } from "./date-range-fields"
import { QuickRangeButtons } from "./quick-range-buttons"

interface PdfExportDialogProps {
  open: boolean
  dateRange: DateRangeProps
  summary: PdfSummaryProps
  isLoading: boolean
  isGenerating: boolean
  onOpenChange: (open: boolean) => void
  applyQuickRange: (preset: QuickRange) => void
  onGenerate: () => void
}

export default function PdfExportDialog({
  open,
  dateRange,
  summary,
  isLoading,
  isGenerating,
  onOpenChange,
  applyQuickRange,
  onGenerate,
}: PdfExportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Monthly Report (PDF)</DialogTitle>
          <DialogDescription>
            Generate a polished monthly operations report with summary metrics,
            charts, and detailed tables.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <QuickRangeButtons onSelect={applyQuickRange} />
          <DateRangeFields range={dateRange} />
          {isLoading ? (
            <div className="space-y-1">
              <Skeleton className="w-48 h-3" />
              <Skeleton className="w-40 h-3" />
            </div>
          ) : summary.summaryLines.length > 0 ? (
            <div className="space-y-1">
              {summary.summaryLines.map((line) => (
                <div key={line} className="text-xs text-muted-foreground">
                  {line}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {!isLoading && summary.isEmpty ? (
          <div className="py-4 text-sm text-center text-muted-foreground">
            No data found for the selected date range. Try a wider range or use
            the Quick range buttons above.
          </div>
        ) : null}

        {isGenerating ? (
          <div className="space-y-1.5 px-6 pb-2">
            <Progress />
            <p className="text-xs text-center text-muted-foreground">
              Rendering report — this may take up to 30 seconds
            </p>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onGenerate}
            disabled={summary.isEmpty || isGenerating}
          >
            {isGenerating ? "Rendering…" : "Generate PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
