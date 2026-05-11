"use client"

import { useConvexAuth } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"

export default function Dashboard() {
  const { isAuthenticated } = useConvexAuth()
  const user = useQuery(
    api.users.queries.currentUser,
    isAuthenticated ? {} : "skip"
  )

  const hours = new Date().getHours()
  const greetings =
    hours < 12 ? "morning" : hours < 18 ? "afternoon" : "evening"

  return (
    <>
      <h2 className="font-semibold type-lg">
        Good {greetings},{" "}
        {user === undefined ? (
          <Skeleton className="inline-block w-32 h-5" />
        ) : (
          user?.name
        )}
        !
      </h2>
    </>
  )
}
