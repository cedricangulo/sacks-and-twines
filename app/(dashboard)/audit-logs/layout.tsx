import type { Metadata } from "next"
import AuditLogsClientLayout from "./_client-layout"

export const metadata: Metadata = {
  title: "Audit Logs",
  description:
    "View and search audit logs to track all changes in the Sacks & Twines system",
  openGraph: {
    title: "Audit Logs",
    description:
      "View and search audit logs to track all changes in the Sacks & Twines system",
    url: "/audit-logs",
  },
  twitter: {
    title: "Audit Logs",
    description:
      "View and search audit logs to track all changes in the Sacks & Twines system",
  },
  alternates: {
    canonical: "/audit-logs",
  },
}

interface Props {
  children: React.ReactNode
}

export default function AuditLogsLayout({ children }: Props) {
  return <AuditLogsClientLayout>{children}</AuditLogsClientLayout>
}
