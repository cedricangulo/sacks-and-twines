"use client"

import { useConvexAuth } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { createContext, useContext } from "react"
import { api } from "@/convex/_generated/api"
import type { Doc } from "@/convex/_generated/dataModel"

type CurrentUserContextValue = {
  user: Doc<"users"> | null | undefined
  isLoading: boolean
  isAuthenticated: boolean
}

const CurrentUserContext = createContext<CurrentUserContextValue | undefined>(
  undefined
)

export function CurrentUserProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth()
  const user = useQuery(
    api.users.queries.currentUser,
    isAuthenticated ? {} : "skip"
  )

  const isLoading = isAuthLoading || (user === undefined && isAuthenticated)

  return (
    <CurrentUserContext.Provider value={{ user, isLoading, isAuthenticated }}>
      {children}
    </CurrentUserContext.Provider>
  )
}

export function useCurrentUser(): CurrentUserContextValue {
  const context = useContext(CurrentUserContext)
  if (context === undefined) {
    throw new Error("useCurrentUser must be used within a CurrentUserProvider")
  }
  return context
}
