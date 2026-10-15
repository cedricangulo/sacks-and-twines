"use client"

import { DownloadIcon } from "@phosphor-icons/react"
import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { useDispatchExport } from "../../hooks/use-dispatch-export"
import DispatchExportDialog from "./dispatch-export-dialog"

export default function ReportExportButton({
  monthStartMs,
}: {
  monthStartMs: number
}) {
  const dispatchExport = useDispatchExport()

  const range = useMemo(
    () =>
      dispatchExport.custom ?? {
        from: new Date(dispatchExport.startMs),
        to: new Date(dispatchExport.endMs),
      },
    [dispatchExport.custom, dispatchExport.startMs, dispatchExport.endMs]
  )

  const handleOpen = () => {
    dispatchExport.init(monthStartMs)
    dispatchExport.setDialogOpen(true)
  }

  return (
    <>
      <Button onClick={handleOpen}>
        <DownloadIcon weight="fill" />
        Export
      </Button>

      <DispatchExportDialog
        open={dispatchExport.dialogOpen}
        onOpenChange={dispatchExport.setDialogOpen}
        format={dispatchExport.format}
        onFormatChange={(format) => {
          dispatchExport.setFormat(format)
        }}
        mode={dispatchExport.mode}
        onModeChange={dispatchExport.applyMode}
        range={range}
        onRangeChange={dispatchExport.setCustom}
        dispatchCount={dispatchExport.dispatchCount}
        truncated={dispatchExport.truncated}
        isLargePdf={dispatchExport.isLargePdf}
        isLoading={dispatchExport.isLoading}
        isWorking={dispatchExport.isWorking}
        queryFailed={dispatchExport.queryFailed}
        isEmpty={dispatchExport.isEmpty}
        error={dispatchExport.error}
        onExport={dispatchExport.runExport}
      />
    </>
  )
}
