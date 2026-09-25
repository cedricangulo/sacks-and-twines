"use client"

import { PackageIcon, XCircleIcon } from "@phosphor-icons/react"
import { useState } from "react"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import SkeletonTable, {
  type SkeletonColumn,
} from "@/components/ui/skeleton-table"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"
import ReceivingFilterBar from "@/features/receiving-history/components/receiving-filter-bar"
import ReceivingPagination from "@/features/receiving-history/components/receiving-pagination"
import ReceivingTableContainer from "@/features/receiving-history/components/table/receiving-table-container"
import {
  RECEIVING_ITEMS_PER_PAGE,
  RECEIVING_TABLE_COLUMNS,
} from "@/features/receiving-history/constants"
import { useReceivingFilters } from "@/features/receiving-history/hooks/use-receiving-filters"
import { useReceivingHistory } from "@/features/receiving-history/hooks/use-receiving-history"

// Skeleton mirrors the real column types so numeric/currency cells load
// right-aligned, matching the rendered table.
const SKELETON_COLUMNS: SkeletonColumn[] = [
  { label: "Batch Code", type: "mono" },
  ...RECEIVING_TABLE_COLUMNS,
]

export default function ReceivingHistoryPage() {
  const { user, isLoading: isUserLoading, isAuthenticated } = useCurrentUser()
  const {
    search,
    dateRange,
    supplierId,
    status,
    setFilters,
    hasActiveFilters,
    clearFilters,
  } = useReceivingFilters()

  const {
    page,
    rawPageLength,
    isLoading,
    isTransitioning,
    pageNum,
    goNext,
    goPrev,
    hasNext,
    hasPrev,
  } = useReceivingHistory({
    dateRange,
    supplierId,
    status,
    search,
    skip: !isAuthenticated,
  })

  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({})

  const showSkeleton = isUserLoading || isLoading

  // A residual filter (status combined with a supplier) is applied after
  // pagination, so a page can come back empty while matching rows sit further
  // along the cursor. The pagination controls therefore stay mounted outside the
  // empty states below.
  const showPagination = !showSkeleton && user?.role === "owner"
  const hiddenByResidualFilter =
    !showSkeleton && page.length < rawPageLength && rawPageLength > 0

  return (
    <div className="min-w-0 flex-1 space-y-4">
      <ReceivingFilterBar
        search={search}
        onSearchChange={(value) => setFilters({ search: value })}
        dateRange={dateRange}
        supplierId={supplierId}
        status={status}
        onFilterChange={(updates) => setFilters(updates)}
        hasActiveFilters={hasActiveFilters}
        onClear={clearFilters}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
      />

      {showSkeleton ? (
        <SkeletonTable
          columns={SKELETON_COLUMNS}
          actions="ellipsis"
          rowCount={
            RECEIVING_ITEMS_PER_PAGE > 10 ? 11 : RECEIVING_ITEMS_PER_PAGE
          }
        />
      ) : user?.role !== "owner" ? (
        <p className="type-body-small text-muted-foreground">
          You don&apos;t have permission to access this page.
        </p>
      ) : page.length > 0 ? (
        <ReceivingTableContainer
          batches={page}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
        />
      ) : hasActiveFilters || search ? (
        <Empty className="animate-fade-in">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <XCircleIcon size={16} weight="fill" />
            </EmptyMedia>
            <EmptyTitle>No stock-ins found</EmptyTitle>
            <EmptyDescription>
              {rawPageLength > 0
                ? "No rows on this page match the current filters. Use Next to look further back."
                : "Try adjusting the date range or clearing your filters."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Empty className="animate-fade-in">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PackageIcon size={16} weight="fill" />
            </EmptyMedia>
            <EmptyTitle>No stock-ins yet</EmptyTitle>
            <EmptyDescription>
              Received inventory will appear here once you add it.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {showPagination && hiddenByResidualFilter ? (
        <p className="type-body-small text-muted-foreground">
          {page.length} of {rawPageLength} stock-ins on this page match the
          current filters.
        </p>
      ) : null}

      {showPagination ? (
        <ReceivingPagination
          pageNum={pageNum}
          hasNext={hasNext}
          hasPrev={hasPrev}
          onNext={goNext}
          onPrev={goPrev}
          isLoading={isTransitioning}
        />
      ) : null}
    </div>
  )
}
