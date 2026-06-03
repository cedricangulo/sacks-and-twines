import { headers } from "next/headers"
import { ReactNode } from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { DispatchQueueProvider } from "@/features/dispatches/hooks/dispatch-queue-context"

interface Props {
  children: ReactNode
}

export default async function DashboardLayout({ children }: Props) {
  const headersList = await headers()
  const initialRole = headersList.get("x-user-role") ?? undefined

  return (
    <DispatchQueueProvider>
      <DashboardShell initialRole={initialRole}>{children}</DashboardShell>
    </DispatchQueueProvider>
  )
}
