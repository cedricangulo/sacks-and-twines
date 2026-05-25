"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import LoadingPage from "@/components/loading-page"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"

export default function HomePageClient() {
  const { push } = useRouter()
  const { user, isLoading, isAuthenticated } = useCurrentUser()

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      push("/sign-in")
      return
    }

    if (user === undefined) return

    if (user === null) {
      push("/sign-in")
      return
    }

    if (user.role === "owner") {
      push("/dashboard")
    } else if (user.role === "staff") {
      push("/products")
    } else {
      push("/sign-in")
    }
  }, [isLoading, isAuthenticated, user, push])

  return <LoadingPage />
}
