"use client"

import { ClockCounterClockwiseIcon, XCircleIcon } from "@phosphor-icons/react"
import { useState } from "react"
import { Accordion } from "@/components/ui/accordion"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import type { AuditLogEntry } from "../hooks/use-audit-logs"
import AuditLogItem from "./audit-log-item"

// Props for the audit log accordion.
interface AuditLogAccordionProps {
  page: AuditLogEntry[]
  isLoading: boolean
  hasActiveFilters?: boolean
  search?: string
}

// Accordion list of audit log entries with loading skeleton and empty state.
export default function AuditLogAccordion({
  page,
  isLoading,
  hasActiveFilters,
  search,
}: AuditLogAccordionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-220px)] overflow-y-auto space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (page.length === 0) {
    return (
      <Empty className="h-[calc(100vh-220px)]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            {search || hasActiveFilters ? (
              <XCircleIcon size={16} weight="bold" />
            ) : (
              <ClockCounterClockwiseIcon weight="fill" size={16} />
            )}
          </EmptyMedia>
          <EmptyTitle>
            {search || hasActiveFilters
              ? "No logs match your filters"
              : "No audit logs yet"}
          </EmptyTitle>
          <EmptyDescription>
            {search || hasActiveFilters
              ? "Try adjusting your search or filters."
              : "System activity will be recorded here."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="h-[calc(100vh-220px)] overflow-y-auto px-2">
      <Accordion
        type="single"
        collapsible
        value={expandedId ?? ""}
        onValueChange={(value) => setExpandedId(value || null)}
      >
        {page.map((log) => (
          <AuditLogItem
            key={log._id}
            log={log}
            isExpanded={expandedId === log._id}
          />
        ))}
      </Accordion>
    </div>
  )
}
