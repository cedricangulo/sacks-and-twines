"use client"

import { Skeleton } from "@/components/ui/skeleton"
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
    <div className="p-6 space-y-6">
      <h2 className="font-semibold type-lg">
        Good {greetings},{" "}
        {isLoading ? (
          <Skeleton className="inline-block w-32 h-5" />
        ) : (
          user?.name
        )}
        !
      </h2>
      {children}
    </div>
  )
}
