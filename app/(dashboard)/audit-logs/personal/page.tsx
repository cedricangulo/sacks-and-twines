"use client"

import AuditLogAccordion from "@/features/audit-logs/components/audit-log-accordion"
import AuditLogPagination from "@/features/audit-logs/components/audit-log-pagination"
import { usePersonalAuditLogs } from "@/features/audit-logs/hooks/use-personal-audit-logs"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"

export default function PersonalAuditLogsPage() {
  const { isAuthenticated } = useCurrentUser()
  const { page, isLoading, pageNum, goNext, goPrev, hasNext, hasPrev } =
    usePersonalAuditLogs(!isAuthenticated)

  return (
    <div className="flex-1 space-y-6">
      <AuditLogAccordion page={page} isLoading={isLoading} />
      <AuditLogPagination
        pageNum={pageNum}
        hasNext={hasNext}
        hasPrev={hasPrev}
        onNext={goNext}
        onPrev={goPrev}
        isLoading={isLoading}
      />
    </div>
  )
}
