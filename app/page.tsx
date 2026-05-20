"use client"

import { redirect } from "next/navigation"
import { useEffect } from "react"
import { Spinner } from "@/components/ui/spinner"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"

export default function HomePage() {
  const { user, isLoading, isAuthenticated } = useCurrentUser()

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      redirect("/sign-in")
      return
    }

    if (user === undefined) return

    if (user === null) {
      redirect("/sign-in")
      return
    }

    if (user.role === "owner") {
      redirect("/dashboard")
    } else if (user.role === "staff") {
      redirect("/products")
    } else {
      redirect("/sign-in")
    }
  }, [isLoading, isAuthenticated, user])

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
