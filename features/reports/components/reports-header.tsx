"use client"

import { useMemo } from "react"
import { PageHeaderSetter } from "@/components/page-header-context"
import { useReportFiltersContext } from "../hooks/report-filters-context"
import ReportExportButton from "./export/report-export-button"

export default function ReportsHeader() {
  const { monthStartMs } = useReportFiltersContext()
  // Header actions render outside the report provider. Pass the selected month
  // explicitly, and keep the action stable on day and pagination changes.
  const actions = useMemo(
    () => <ReportExportButton monthStartMs={monthStartMs} />,
    [monthStartMs]
  )

  return <PageHeaderSetter title="Reports" actions={actions} />
}
