"use client"

import CursorPagination from "@/components/cursor-pagination"

// Props for the audit log pagination controls.
interface AuditLogPaginationProps {
  pageNum: number
  hasNext: boolean
  hasPrev: boolean
  onNext: () => void
  onPrev: () => void
  isLoading: boolean
}

// Previous/next pagination controls for the audit log list.
export default function AuditLogPagination(props: AuditLogPaginationProps) {
  return <CursorPagination {...props} />
}
