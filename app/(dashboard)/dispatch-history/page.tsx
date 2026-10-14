"use client"

import { PackageIcon, XCircleIcon } from "@phosphor-icons/react"
import { parseAsString, useQueryState } from "nuqs"
import { useState } from "react"
import {
  FilteredEmptyState,
  FilteredTablePage,
} from "@/components/filtered-table-page"
import { resolveFilteredTableState } from "@/components/filtered-table-state"
import SkeletonTable from "@/components/ui/skeleton-table"
import DispatchFilterBar from "@/features/dispatch-history/components/dispatch-filter-bar"
import DispatchTableContainer from "@/features/dispatch-history/components/table/dispatch-table-container"
import { DISPATCH_SKELETON_COLUMNS } from "@/features/dispatch-history/constants"
import { useDispatchHistoryFilters } from "@/features/dispatch-history/hooks/use-dispatch-history-filters"
import { useDispatches } from "@/features/dispatch-history/hooks/use-dispatches"

// Applies the filter-bar update to the matching state owner. Kept outside the
// page component so the page's control flow stays flat.
function applyDispatchFilterChange(
  filters: Partial<{ createdByUserId: string }>,
  setCreatedByUserId: (value: string) => void
) {
  if (filters.createdByUserId) setCreatedByUserId(filters.createdByUserId)
}

export default function DispatchHistoryPage() {
  const [createdByUserId, setCreatedByUserId] = useQueryState(
    "createdByUserId",
    parseAsString.withDefault("all").withOptions({
      history: "replace",
    })
  )

  const { data: dispatches, isLoading } = useDispatches({ createdByUserId })

  const { search, setSearch, filtered, hasActiveFilters, clearFilters } =
    useDispatchHistoryFilters(dispatches)

  const [dispatchVisibility, setDispatchVisibility] = useState<
    Record<string, boolean>
  >({})
  const [itemsVisibility, setItemsVisibility] = useState<
    Record<string, boolean>
  >({})

  const displayData = filtered ?? []
  const state = resolveFilteredTableState({
    isLoading,
    hasRows: displayData.length > 0,
  })

  return (
    <FilteredTablePage
      filterBar={
        <DispatchFilterBar
          search={search}
          onSearchChange={setSearch}
          createdByUserId={createdByUserId}
          onFilterChange={(filters) =>
            applyDispatchFilterChange(filters, setCreatedByUserId)
          }
          hasActiveFilters={hasActiveFilters}
          onClear={clearFilters}
          dispatchVisibility={dispatchVisibility}
          onDispatchVisibilityChange={setDispatchVisibility}
          itemsVisibility={itemsVisibility}
          onItemsVisibilityChange={setItemsVisibility}
        />
      }
      state={state}
      skeleton={
        <SkeletonTable columns={DISPATCH_SKELETON_COLUMNS} actions="none" />
      }
      table={
        <DispatchTableContainer
          dispatches={displayData}
          columnVisibility={dispatchVisibility}
          onColumnVisibilityChange={setDispatchVisibility}
          itemsColumnVisibility={itemsVisibility}
          onItemsColumnVisibilityChange={setItemsVisibility}
        />
      }
      empty={
        <FilteredEmptyState
          isFiltered={hasActiveFilters}
          filteredIcon={<XCircleIcon weight="bold" />}
          emptyIcon={<PackageIcon weight="fill" />}
          filteredTitle="No dispatches match your filters"
          emptyTitle="No dispatch history yet"
          filteredDescription="Try adjusting your search or filters."
          emptyDescription="Dispatched orders will appear here."
        />
      }
    />
  )
}
