"use client"

import { usePathname } from "next/navigation"
import { PageHeaderSetter } from "@/components/page-header-context"

interface Props {
  children: React.ReactNode
}

export default function AuditLogsLayout({ children }: Props) {
  const pathname = usePathname()

  return (
    <>
      <PageHeaderSetter
        title="Audit Logs"
        backHref={pathname !== "/audit-logs" ? "/products" : null}
      />
      <div className="p-6 space-y-6">{children}</div>
    </>
  )
}
