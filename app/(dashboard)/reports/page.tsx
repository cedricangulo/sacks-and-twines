import CalendarDetailPanel from "@/features/reports/components/calendar/calendar-detail-panel"
import CalendarGrid from "@/features/reports/components/calendar/calendar-grid"
import MonthlyStatsBar from "@/features/reports/components/calendar/monthly-stats-bar"

// Reports page with calendar view and detail panel.
export default function ReportsPage() {
  return (
    <>
      <MonthlyStatsBar />
      <CalendarGrid />
      <CalendarDetailPanel />
    </>
  )
}
