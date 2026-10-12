"use client"

import CursorPagination from "@/components/cursor-pagination"

interface ReceivingPaginationProps {
  pageNum: number
  hasNext: boolean
  hasPrev: boolean
  onNext: () => void
  onPrev: () => void
  isLoading: boolean
}

// Previous/next cursor pagination for the receiving history list.
export default function ReceivingPagination(props: ReceivingPaginationProps) {
  return <CursorPagination {...props} />
}
