"use client"

import { PackageIcon, XCircleIcon } from "@phosphor-icons/react"
import { parseAsString, useQueryState } from "nuqs"
import { useState } from "react"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import SkeletonTable from "@/components/ui/skeleton-table"
import DispatchFilterBar from "@/features/dispatch-history/components/dispatch-filter-bar"
import DispatchTableContainer from "@/features/dispatch-history/components/table/dispatch-table-container"
import { useDispatchHistoryFilters } from "@/features/dispatch-history/hooks/use-dispatch-history-filters"
import { useDispatches } from "@/features/dispatch-history/hooks/use-dispatches"

export default function DispatchHistoryPage() {
  const [createdByUserId, setCreatedByUserId] = useQueryState(
    "createdByUserId",
    parseAsString.withDefault("all").withOptions({
      history: "replace",
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
    <div className="flex-1 space-y-4">
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
        <SkeletonTable
          columns={[
            { label: "", type: "expand" },
            { label: "Customer Ref", type: "text" },
            { label: "Dispatched By", type: "text" },
            { label: "Status", type: "badge" },
            { label: "Total Items", type: "mono" },
            { label: "Dispatched At", type: "date" },
          ]}
          actions="none"
        />
      ) : displayData.length > 0 ? (
        <DispatchTableContainer
          dispatches={displayData}
          columnVisibility={dispatchVisibility}
          onColumnVisibilityChange={setDispatchVisibility}
          itemsColumnVisibility={itemsVisibility}
          onItemsColumnVisibilityChange={setItemsVisibility}
        />
      ) : (
        <Empty className="animate-fade-in">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              {search || hasActiveFilters ? (
                <XCircleIcon weight="bold" />
              ) : (
                <PackageIcon weight="fill" />
              )}
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
