import type { Metadata } from "next"
import { PageHeaderSetter } from "@/components/page-header-context"

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
    <>
      <PageHeaderSetter title="Reports" />
      <div className="p-6 space-y-6">{children}</div>
    </>
  )
}
