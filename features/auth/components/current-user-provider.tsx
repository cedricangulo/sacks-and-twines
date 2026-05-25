"use client"

import { useConvexAuth } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { createContext, use, useMemo, useSyncExternalStore } from "react"
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
  const isHydrating = useSyncExternalStore(
    () => () => {},
    () => false,
    () => true
  )

  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth()
  const user = useQuery(
    api.users.queries.currentUser,
    isAuthenticated ? {} : "skip"
  )

  const isLoading =
    isAuthLoading || isHydrating || (user === undefined && isAuthenticated)

  const value = useMemo(
    () => ({ user, isLoading, isAuthenticated }),
    [user, isLoading, isAuthenticated]
  )

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  )
}

export function useCurrentUser(): CurrentUserContextValue {
  const context = use(CurrentUserContext)
  if (context === undefined) {
    throw new Error("useCurrentUser must be used within a CurrentUserProvider")
  }
  return context
}
