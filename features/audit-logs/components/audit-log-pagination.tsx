"use client"

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface AuditLogPaginationProps {
  pageNum: number
  hasNext: boolean
  hasPrev: boolean
  onNext: () => void
  onPrev: () => void
  isLoading: boolean
}

export default function AuditLogPagination({
  pageNum,
  hasNext,
  hasPrev,
  onNext,
  onPrev,
  isLoading,
}: AuditLogPaginationProps) {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={hasPrev && !isLoading ? onPrev : undefined}
            href={hasPrev && !isLoading ? "#" : undefined}
            text="Previous"
            className={
              !hasPrev || isLoading
                ? "pointer-events-none opacity-50"
                : "cursor-pointer"
            }
          />
        </PaginationItem>

        <PaginationItem>
          <span className="flex h-9 items-center px-4 text-sm tabular-nums text-muted-foreground">
            Page {pageNum}
          </span>
        </PaginationItem>

        <PaginationItem>
          <PaginationNext
            onClick={hasNext && !isLoading ? onNext : undefined}
            href={hasNext && !isLoading ? "#" : undefined}
            text="Next"
            className={
              !hasNext || isLoading
                ? "pointer-events-none opacity-50"
                : "cursor-pointer"
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
