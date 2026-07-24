"use client"

import { useAuthActions } from "@convex-dev/auth/react"
import { ListDashesIcon, PackageIcon, SignOutIcon } from "@phosphor-icons/react"
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
    <header
      className="flex h-16 shrink-0 items-center justify-between px-6 gap-6 overflow-hidden transition-[width,height] ease-linear"
      style={{ viewTransitionName: "site-header" }}
    >
      <Link className="text-md" href="/products">
        Sacks and Twines
      </Link>
      <div className="flex items-center gap-2">
        <Button variant="secondary" asChild>
          <Link href="/products" transitionTypes={["nav-forward"]}>
            <PackageIcon weight="fill" />
            Dispatch
          </Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/audit-logs/personal" transitionTypes={["nav-forward"]}>
            <ListDashesIcon weight="fill" />
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
          <SignOutIcon weight="fill" />
          Sign Out
        </Button>
      </div>
    </header>
  )
}
