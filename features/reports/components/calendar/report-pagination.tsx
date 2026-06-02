"use client"

import { useMemo } from "react"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import type { ReportPagination as PaginationState } from "@/features/reports/hooks/use-report-pagination"

// Props for the report pagination component.
interface ReportPaginationProps {
  pagination: PaginationState
}

// Simple pagination controls for the reports detail panel tables.
export default function ReportPagination({
  pagination,
}: ReportPaginationProps) {
  const { page, totalPages, hasPrev, hasNext, onNext, onPrev, onGoToPage } =
    pagination
  const pages: (number | "...")[] = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const result: (number | "...")[] = [1]

    if (page > 3) {
      result.push("...")
    }

    const start = Math.max(2, page - 1)
    const end = Math.min(totalPages - 1, page + 1)
    for (let i = start; i <= end; i++) {
      result.push(i)
    }

    if (page < totalPages - 2) {
      result.push("...")
    }

    result.push(totalPages)
    return result
  }, [page, totalPages])

  return (
    <Pagination className="w-fit mx-0">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={hasPrev ? onPrev : undefined}
            href={hasPrev ? "#" : undefined}
            text="Previous"
            className={
              !hasPrev ? "pointer-events-none opacity-50" : "cursor-pointer"
            }
          />
        </PaginationItem>

        {pages.map((p, i) => {
          if (p === "...") {
            const ellipsisIndex = pages
              .slice(0, i)
              .filter((item) => item === "...").length
            return (
              <PaginationItem key={`ellipsis-${ellipsisIndex}`}>
                <span className="flex h-9 items-center px-2 text-muted-foreground">
                  ...
                </span>
              </PaginationItem>
            )
          }
          return (
            <PaginationItem key={p}>
              <PaginationLink
                href="#"
                isActive={p === page}
                onClick={(e) => {
                  e.preventDefault()
                  onGoToPage(p)
                }}
              >
                {p}
              </PaginationLink>
            </PaginationItem>
          )
        })}

        <PaginationItem>
          <PaginationNext
            onClick={hasNext ? onNext : undefined}
            href={hasNext ? "#" : undefined}
            text="Next"
            className={
              !hasNext ? "pointer-events-none opacity-50" : "cursor-pointer"
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
