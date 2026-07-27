"use client"

import { PageHeaderSetter } from "@/components/page-header-context"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"

interface Props {
  children: React.ReactNode
}

export default function DashboardPageLayout({ children }: Props) {
  const { user, isLoading } = useCurrentUser()

  const hours = new Date().getHours()
  const greetings =
    hours < 12 ? "morning" : hours < 18 ? "afternoon" : "evening"

  return (
    <>
      <PageHeaderSetter
        title={`Good ${greetings}, ${isLoading ? "..." : user?.name}!`}
      />
      <div className="p-6 pt-0 space-y-6">{children}</div>
    </>
  )
}
