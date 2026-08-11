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
import { cn } from "@/lib/utils"
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
      <div className="h-[calc(100vh-220px)] overflow-y-auto px-2">
        <div className="flex w-full flex-col overflow-hidden rounded-2xl border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={cn("flex flex-col gap-2 p-4", i < 4 && "border-b")}
            >
              <div className="flex items-baseline gap-2">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-20 rounded-3xl" />
              </div>
              <div className="flex items-baseline gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-56" />
              </div>
            </div>
          ))}
        </div>
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
        value={expandedId ? [expandedId] : []}
        onValueChange={(value) => setExpandedId(value[0] ?? null)}
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
