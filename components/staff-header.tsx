"use client"

import { useAuthActions } from "@convex-dev/auth/react"
import { Box, LogOut, Logs } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePageHeader } from "@/components/page-header-context"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export function StaffHeader() {
  const { signOut } = useAuthActions()
  const { push } = useRouter()
  const { actions } = usePageHeader()

  return (
    <header className="flex items-center justify-between w-full h-16 px-6 border-b shrink-0 bg-background">
      <Button asChild variant="ghost">
        <Link href="/products">Sacks and Twines</Link>
      </Button>
      <div className="flex items-center gap-2">
        <Button variant="secondary" asChild>
          <Link href="/products">
            <Box />
            Dispatch
          </Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/audit-logs/personal">
            <Logs />
            My Activity
          </Link>
        </Button>
        {actions ? (
          <>
            <Separator orientation="vertical" />
            {actions}
          </>
        ) : null}
        <Separator orientation="vertical" />
        <Button
          variant="destructive"
          onClick={() => {
            push("/sign-in")
            signOut()
          }}
        >
          <LogOut />
          Sign Out
        </Button>
      </div>
    </header>
  )
}
