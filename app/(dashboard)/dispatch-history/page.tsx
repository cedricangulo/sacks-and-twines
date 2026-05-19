"use client"

import { Package, SearchX } from "lucide-react"
import { parseAsString, useQueryState } from "nuqs"
import { useState } from "react"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import DispatchFilterBar from "@/features/dispatch-history/components/dispatch-filter-bar"
import DispatchTable from "@/features/dispatch-history/components/table/dispatch-table"
import { useDispatchHistoryFilters } from "@/features/dispatch-history/hooks/use-dispatch-history-filters"
import { useDispatches } from "@/features/dispatch-history/hooks/use-dispatches"

export default function DispatchHistoryPage() {
  const [createdByUserId, setCreatedByUserId] = useQueryState(
    "createdByUserId",
    parseAsString.withDefault("all").withOptions({
      history: "replace",
      shallow: false,
    })
  )

  const { data: dispatches, isLoading } = useDispatches({ createdByUserId })

  const {
    search,
    setSearch,
    status,
    setFilters,
    filtered,
    hasActiveFilters,
    clearFilters,
  } = useDispatchHistoryFilters(dispatches)

  const [dispatchVisibility, setDispatchVisibility] = useState<
    Record<string, boolean>
  >({})
  const [itemsVisibility, setItemsVisibility] = useState<
    Record<string, boolean>
  >({})

  const displayData = filtered ?? []

  return (
    <div className="flex-1 space-y-6">
      <DispatchFilterBar
        search={search}
        onSearchChange={setSearch}
        status={status}
        createdByUserId={createdByUserId}
        onFilterChange={(filters) => {
          if (filters.status) setFilters({ status: filters.status })
          if (filters.createdByUserId)
            setCreatedByUserId(filters.createdByUserId)
        }}
        hasActiveFilters={hasActiveFilters}
        onClear={clearFilters}
        dispatchVisibility={dispatchVisibility}
        onDispatchVisibilityChange={setDispatchVisibility}
        itemsVisibility={itemsVisibility}
        onItemsVisibilityChange={setItemsVisibility}
      />
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : displayData.length > 0 ? (
        <DispatchTable
          dispatches={displayData}
          columnVisibility={dispatchVisibility}
          onColumnVisibilityChange={setDispatchVisibility}
          itemsColumnVisibility={itemsVisibility}
          onItemsColumnVisibilityChange={setItemsVisibility}
        />
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              {search || hasActiveFilters ? <SearchX /> : <Package />}
            </EmptyMedia>
            <EmptyTitle>
              {search || hasActiveFilters
                ? "No dispatches match your filters"
                : "No dispatch history yet"}
            </EmptyTitle>
            <EmptyDescription>
              {search || hasActiveFilters
                ? "Try adjusting your search or filters."
                : "Dispatched orders will appear here."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  )
}
