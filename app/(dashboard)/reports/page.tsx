import CalendarDetailPanel from "@/features/reports/components/calendar/calendar-detail-panel"
import CalendarGrid from "@/features/reports/components/calendar/calendar-grid"
import { ReportFiltersProvider } from "@/features/reports/hooks/report-filters-context"

/** Reports page with calendar view and detail panel. */
export default function ReportsPage() {
  return (
    <ReportFiltersProvider>
      <CalendarGrid />
      <CalendarDetailPanel />
    </ReportFiltersProvider>
  )
}
