"use client"

import { DownloadIcon, FileTextIcon, FileXlsIcon } from "@phosphor-icons/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EXPORT_ENTITY_NAMES, type ExportEntity } from "../../constants"
import { useReportFiltersContext } from "../../hooks/report-filters-context"
import { usePdfExport } from "../../hooks/use-pdf-export"
import { useReportExport } from "../../hooks/use-report-export"
import CsvExportDialog from "./csv-export-dialog"
import PdfExportDialog from "./pdf-export-dialog"

export default function ReportExportButton() {
  const { monthStartMs, monthEndMs } = useReportFiltersContext()

  const [csvEntity, setCsvEntity] = useState<ExportEntity | null>(null)

  const csvExport = useReportExport(csvEntity)
  const pdfExport = usePdfExport()

  const handleCsvSelect = (entity: ExportEntity) => {
    setCsvEntity(entity)
    csvExport.initForEntity(entity, monthStartMs, monthEndMs)
    csvExport.setDialogOpen(true)
  }

  const handlePdfSelect = () => {
    pdfExport.initForEntity(monthStartMs, monthEndMs)
    pdfExport.setDialogOpen(true)
  }

  return (
    <>
      <DropdownMenu>
        {/* Export temporarily disabled — quota protection while on free-tier deployment */}
        <DropdownMenuTrigger render={<Button disabled />}>
          <DownloadIcon weight="fill" />
          Export
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>CSV Export</DropdownMenuLabel>
            {Object.entries(EXPORT_ENTITY_NAMES).map(([key, label]) => (
              <DropdownMenuItem
                key={key}
                onClick={() => handleCsvSelect(key as ExportEntity)}
              >
                <FileXlsIcon
                  weight="fill"
                  className="size-4 text-muted-foreground"
                />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handlePdfSelect}>
            <FileTextIcon weight="fill" className="size-4 text-primary" />
            Monthly Report (PDF)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {csvEntity ? (
        <CsvExportDialog
          open={csvExport.dialogOpen}
          onOpenChange={csvExport.setDialogOpen}
          entity={csvEntity}
          dateRange={{
            startDate: csvExport.startDate,
            setStartDate: csvExport.setStartDate,
            endDate: csvExport.endDate,
            setEndDate: csvExport.setEndDate,
            startTime: csvExport.startTime,
            setStartTime: csvExport.setStartTime,
            endTime: csvExport.endTime,
            setEndTime: csvExport.setEndTime,
          }}
          applyQuickRange={csvExport.applyQuickRange}
          columns={{
            entity: csvEntity,
            selectedColumns: csvExport.selectedColumns,
            toggleColumn: csvExport.toggleColumn,
            toggleAll: csvExport.toggleAll,
          }}
          recordCount={csvExport.recordCount}
          isLoading={csvExport.isLoading}
          error={csvExport.error}
          onDownload={csvExport.download}
        />
      ) : null}

      <PdfExportDialog
        open={pdfExport.dialogOpen}
        onOpenChange={pdfExport.setDialogOpen}
        dateRange={{
          startDate: pdfExport.startDate,
          setStartDate: pdfExport.setStartDate,
          endDate: pdfExport.endDate,
          setEndDate: pdfExport.setEndDate,
          startTime: pdfExport.startTime,
          setStartTime: pdfExport.setStartTime,
          endTime: pdfExport.endTime,
          setEndTime: pdfExport.setEndTime,
        }}
        applyQuickRange={pdfExport.applyQuickRange}
        summary={{
          summaryLines: pdfExport.summaryLines,
          isEmpty: pdfExport.isEmpty,
        }}
        isLoading={pdfExport.isLoading}
        isGenerating={pdfExport.isGenerating}
        queryFailed={pdfExport.queryFailed}
        error={pdfExport.error}
        onGenerate={pdfExport.generate}
      />
    </>
  )
}
