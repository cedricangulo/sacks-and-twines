"use client"

import { useConvexAuth } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { createContext, use, useMemo, useSyncExternalStore } from "react"
import { api } from "@/convex/_generated/api"
import type { Doc } from "@/convex/_generated/dataModel"

// Shape of the current user context exposed to consumers.
type CurrentUserContextValue = {
  user: Doc<"users"> | null | undefined
  isLoading: boolean
  isAuthenticated: boolean
}

const CurrentUserContext = createContext<CurrentUserContextValue | undefined>(
  undefined
)

// Wraps the app tree, fetches the authenticated user from Convex, and provides it via context.
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

// Reads the current user context. Throws if used outside CurrentUserProvider.
export function useCurrentUser(): CurrentUserContextValue {
  const context = use(CurrentUserContext)
  if (context === undefined) {
    throw new Error("useCurrentUser must be used within a CurrentUserProvider")
  }
  return context
}
