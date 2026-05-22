"use client"

import {
  AuditLogAccordion,
  AuditLogFilterBar,
  AuditLogPagination,
} from "@/features/audit-logs/components"
import { useAuditLogFilters } from "@/features/audit-logs/hooks/use-audit-log-filters"
import type { AuditLogFilters } from "@/features/audit-logs/hooks/use-audit-logs"
import { useAuditLogs } from "@/features/audit-logs/hooks/use-audit-logs"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"

export default function AuditLogsPage() {
  const { user, isLoading: isUserLoading, isAuthenticated } = useCurrentUser()

  const {
    search,
    setSearch,
    action,
    dateFrom,
    setDateFrom,
    setFilters,
    filterArgs,
    hasActiveFilters,
    clearFilters,
  } = useAuditLogFilters(undefined)

  const {
    page,
    isLoading: isLogsLoading,
    pageNum,
    goNext,
    goPrev,
    hasNext,
    hasPrev,
  } = useAuditLogs(filterArgs, !isAuthenticated)

  return (
    <div className="flex-1 space-y-6">
      <AuditLogFilterBar
        search={search}
        onSearchChange={setSearch}
        action={action}
        dateFrom={dateFrom}
        disabled={isLogsLoading || isUserLoading || !isAuthenticated}
        onDatePresetChange={setDateFrom}
        onFilterChange={(updates) =>
          setFilters(updates as Partial<AuditLogFilters>)
        }
        filterArgs={filterArgs}
        hasActiveFilters={hasActiveFilters}
        onClear={clearFilters}
      />
      {isUserLoading ? (
        <AuditLogAccordion
          page={[]}
          isLoading={true}
          hasActiveFilters={false}
          search=""
        />
      ) : !isAuthenticated || user?.role !== "owner" ? (
        <p className="text-sm text-muted-foreground">
          You don&apos;t have permission to access this page.
        </p>
      ) : (
        <>
          <AuditLogAccordion
            page={page}
            isLoading={isLogsLoading}
            hasActiveFilters={hasActiveFilters}
            search={search}
          />
          <AuditLogPagination
            pageNum={pageNum}
            hasNext={hasNext}
            hasPrev={hasPrev}
            onNext={goNext}
            onPrev={goPrev}
            isLoading={isLogsLoading}
          />
        </>
      )}
    </div>
  )
}
