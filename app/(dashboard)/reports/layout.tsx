import type { Metadata } from "next"
import { PageHeaderSetter } from "@/components/page-header-context"
import ReportExportButton from "@/features/reports/components/export/report-export-button"
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
      <PageHeaderSetter
        title="Reports"
        actions={
          <ReportFiltersProvider>
            <ReportExportButton />
          </ReportFiltersProvider>
        }
      />
      <div className="px-6 pb-6 space-y-6">{children}</div>
    </ReportFiltersProvider>
  )
}
