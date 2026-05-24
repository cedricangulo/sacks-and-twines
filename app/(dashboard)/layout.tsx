import { headers } from "next/headers"
import { ReactNode } from "react"
import { DashboardShell } from "@/components/dashboard-shell"

interface Props {
  children: ReactNode
}

export default async function DashboardLayout({ children }: Props) {
  const headersList = await headers()
  const initialRole = headersList.get("x-user-role") ?? undefined

  return <DashboardShell initialRole={initialRole}>{children}</DashboardShell>
}
