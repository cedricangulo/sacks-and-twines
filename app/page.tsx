"use client"

import { useConvexAuth, useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/convex/_generated/api"

export default function HomePage() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const router = useRouter()
  const user = useQuery(api.users.currentUser, isAuthenticated ? {} : "skip")

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.replace("/sign-in")
      return
    }

    if (user === undefined) return

    if (user === null) {
      router.replace("/sign-in")
      return
    }

    if (user.role === "owner") {
      router.replace("/dashboard")
    } else if (user.role === "staff") {
      router.replace("/products")
    } else {
      // Unknown role - fall back to sign-in (or adjust to an appropriate fallback)
      router.replace("/sign-in")
    }
  }, [isLoading, isAuthenticated, user, router])

  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-linear-to-br from-background via-background to-muted/40">
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <Spinner className="size-8" />
        <p className="type-base text-muted-foreground">New Michael's</p>
        <h1 className="type-2xl">Sacks and Twines</h1>
      </div>
    </div>
  )
}
