"use client"

import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"

interface Props {
  children: React.ReactNode
}

export default function AuditLogsLayout({ children }: Props) {
  const pathname = usePathname()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-start gap-2">
        {pathname != "/audit-logs" ? (
          <Button variant="ghost" size="icon">
            <Link href="/products">
              <ArrowLeftIcon />
            </Link>
          </Button>
        ) : null}
        <h2 className="font-semibold type-lg">Audit Logs</h2>
      </div>
      {children}
    </div>
  )
}
