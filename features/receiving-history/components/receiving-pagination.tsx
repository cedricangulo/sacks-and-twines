"use client"

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface ReceivingPaginationProps {
  pageNum: number
  hasNext: boolean
  hasPrev: boolean
  onNext: () => void
  onPrev: () => void
  isLoading: boolean
}

// Previous/next cursor pagination for the receiving history list.
export default function ReceivingPagination({
  pageNum,
  hasNext,
  hasPrev,
  onNext,
  onPrev,
  isLoading,
}: ReceivingPaginationProps) {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={hasPrev && !isLoading ? onPrev : undefined}
            href={undefined}
            text="Previous"
            className={
              !hasPrev || isLoading
                ? "pointer-events-none opacity-50"
                : "cursor-pointer"
            }
          />
        </PaginationItem>

        <PaginationItem>
          <span className="flex h-9 items-center px-4 type-body-small tabular-nums text-muted-foreground">
            Page {pageNum}
          </span>
        </PaginationItem>

        <PaginationItem>
          <PaginationNext
            onClick={hasNext && !isLoading ? onNext : undefined}
            href={undefined}
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
