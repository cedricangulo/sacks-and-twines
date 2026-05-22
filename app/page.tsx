"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Spinner } from "@/components/ui/spinner"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"

export default function HomePage() {
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
    // - redirect depends on async user data (role) from Convex
    // - router.push() is used because redirect() throws NEXT_REDIRECT,
    //   which React 19 catches in useEffect and can clear the committed tree
    // - suppress: nextjs-no-client-side-redirect
  }, [isLoading, isAuthenticated, user, push])

  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-linear-to-br from-background via-background to-muted/40">
      <div className="flex flex-col items-center justify-center gap-y-4 text-center">
        <Spinner className="size-8" />
        <p className="type-base text-muted-foreground">New Michael's</p>
        <h1 className="type-2xl">Sacks and Twines</h1>
      </div>
    </div>
  )
}
