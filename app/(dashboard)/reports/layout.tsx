import type { Metadata } from "next"
import ReportsHeader from "@/features/reports/components/reports-header"
import { ReportFiltersProvider } from "@/features/reports/hooks/report-filters-context"

interface Props {
  children: React.ReactNode
}

export const metadata: Metadata = {
  title: "Reports",
  description:
    "View business reports, analytics and calendar data for Sacks & Twines operations",
  openGraph: {
    title: "Reports",
    description:
      "View business reports, analytics and calendar data for Sacks & Twines operations",
    url: "/reports",
  },
  twitter: {
    title: "Reports",
    description:
      "View business reports, analytics and calendar data for Sacks & Twines operations",
  },
  alternates: {
    canonical: "/reports",
  },
}

export default function ReportsLayout({ children }: Props) {
  return (
    <ReportFiltersProvider>
      <ReportsHeader />
      <div className="px-4 pb-4 space-y-6 sm:px-6 sm:pb-6">{children}</div>
    </ReportFiltersProvider>
  )
}
