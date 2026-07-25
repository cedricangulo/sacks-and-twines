"use client"

import { createContext, use, useContext } from "react"
import { useReportFilters } from "./use-report-filters"

type ReportFiltersValue = ReturnType<typeof useReportFilters>

const ReportFiltersContext = createContext<ReportFiltersValue | null>(null)

// Provides report filter state to all child components.
// When nested, the inner provider passes through the outer values
// so teleported components (via PageHeaderSetter) don't lose context.
export function ReportFiltersProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const outer = useContext(ReportFiltersContext)
  const inner = useReportFilters()
  const filters = outer ?? inner
  return (
    <ReportFiltersContext.Provider value={filters}>
      {children}
    </ReportFiltersContext.Provider>
  )
}

// Reads report filter context. Must be used inside ReportFiltersProvider.
export function useReportFiltersContext(): ReportFiltersValue {
  const context = use(ReportFiltersContext)
  if (context === null) {
    throw new Error(
      "useReportFiltersContext must be used within ReportFiltersProvider"
    )
  }
  return context
}
