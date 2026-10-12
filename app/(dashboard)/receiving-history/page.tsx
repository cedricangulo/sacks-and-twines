"use client"

import { PackageIcon, XCircleIcon } from "@phosphor-icons/react"
import { useState } from "react"
import {
  FilteredEmptyState,
  FilteredTablePage,
} from "@/components/filtered-table-page"
import { resolveFilteredTableState } from "@/components/filtered-table-state"
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

// Pagination stays mounted while a search filters the loaded page, so the
// footer is its own component rather than more branches in the page.
function ReceivingPageFooter({
  showPagination,
  hiddenBySearch,
  pageCount,
  rawPageLength,
  pageNum,
  hasNext,
  hasPrev,
  onNext,
  onPrev,
  isLoading,
}: {
  showPagination: boolean
  hiddenBySearch: boolean
  pageCount: number
  rawPageLength: number
  pageNum: number
  hasNext: boolean
  hasPrev: boolean
  onNext: () => void
  onPrev: () => void
  isLoading: boolean
}) {
  if (!showPagination) return null
  return (
    <>
      {hiddenBySearch ? (
        <p className="type-body-small text-muted-foreground">
          {pageCount} of {rawPageLength} stock-ins on this page match the
          current filters.
        </p>
      ) : null}
      <ReceivingPagination
        pageNum={pageNum}
        hasNext={hasNext}
        hasPrev={hasPrev}
        onNext={onNext}
        onPrev={onPrev}
        isLoading={isLoading}
      />
    </>
  )
}

export default function ReceivingHistoryPage() {
  const { user, isLoading: isUserLoading, isAuthenticated } = useCurrentUser()
  const {
    search,
    setSearch,
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
    isInitialLoading,
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

  // Only the *first* load blanks the table. Later refetches keep the previous
  // page on screen, so changing a filter no longer flickers through a skeleton.
  const showSkeleton = isUserLoading || isInitialLoading

  // Search is client-side over the loaded page, so a page can filter down to
  // nothing while matches sit on the next one. Pagination therefore stays
  // mounted outside the empty states below.
  const showPagination = !showSkeleton && user?.role === "owner"
  const hiddenBySearch =
    !showSkeleton && page.length < rawPageLength && rawPageLength > 0

  const state = resolveFilteredTableState({
    isLoading: showSkeleton,
    canAccess: user?.role === "owner",
    hasRows: page.length > 0,
  })

  return (
    <FilteredTablePage
      className="min-w-0 flex-1 space-y-4"
      filterBar={
        <ReceivingFilterBar
          search={search}
          onSearchChange={setSearch}
          dateRange={dateRange}
          supplierId={supplierId}
          status={status}
          onFilterChange={(updates) => setFilters(updates)}
          hasActiveFilters={hasActiveFilters}
          onClear={clearFilters}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
        />
      }
      state={state}
      skeleton={
        <SkeletonTable
          columns={SKELETON_COLUMNS}
          actions="ellipsis"
          rowCount={
            RECEIVING_ITEMS_PER_PAGE > 10 ? 11 : RECEIVING_ITEMS_PER_PAGE
          }
        />
      }
      table={
        <ReceivingTableContainer
          batches={page}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
        />
      }
      empty={
        <FilteredEmptyState
          isFiltered={Boolean(hasActiveFilters || search)}
          filteredIcon={<XCircleIcon size={16} weight="fill" />}
          emptyIcon={<PackageIcon size={16} weight="fill" />}
          filteredTitle="No stock-ins found"
          emptyTitle="No stock-ins yet"
          filteredDescription={
            rawPageLength > 0
              ? "No rows on this page match your search. Use Next to look further back."
              : "Try adjusting the date range or clearing your filters."
          }
          emptyDescription="Received inventory will appear here once you add it."
        />
      }
      footer={
        <ReceivingPageFooter
          showPagination={showPagination}
          hiddenBySearch={hiddenBySearch}
          pageCount={page.length}
          rawPageLength={rawPageLength}
          pageNum={pageNum}
          hasNext={hasNext}
          hasPrev={hasPrev}
          onNext={goNext}
          onPrev={goPrev}
          isLoading={isTransitioning}
        />
      }
    />
  )
}
