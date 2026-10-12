"use client"

import { ArchiveIcon, XCircleIcon } from "@phosphor-icons/react"
import { useQuery } from "convex-helpers/react/cache"
import { useMemo, useState } from "react"
import {
  FilteredEmptyState,
  FilteredTablePage,
} from "@/components/filtered-table-page"
import { resolveFilteredTableState } from "@/components/filtered-table-state"
import SkeletonTable from "@/components/ui/skeleton-table"
import { api } from "@/convex/_generated/api"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"
import InventoryFilterBar from "@/features/inventory/components/inventory-filter-bar"
import InventoryTableContainer from "@/features/inventory/components/table/inventory-table-container"
import { INVENTORY_TABLE_COLUMNS } from "@/features/inventory/constants"
import {
  filterProducts,
  useInventoryFilters,
} from "@/features/inventory/hooks/use-inventory-filters"

export default function InventoryPage() {
  const { user, isLoading: isUserLoading, isAuthenticated } = useCurrentUser()
  const {
    search,
    setSearch,
    status,
    category,
    uom,
    stock,
    setFilters,
    hasActiveFilters,
    clearFilters,
  } = useInventoryFilters()

  // The status filter is pushed to the server so the `by_status` index does the
  // filtering, instead of shipping every product and discarding client-side.
  const products = useQuery(
    api.products.queries.list,
    isAuthenticated ? { status: status === "all" ? "all" : status } : "skip"
  )

  // Remaining filters apply client-side. `filtered === undefined` while the
  // query is unresolved, which is the page's loading signal.
  const filtered = useMemo(
    () => filterProducts(products, { search, category, uom, stock }),
    [products, search, category, uom, stock]
  )

  const [inventoryVisibility, setInventoryVisibility] = useState<
    Record<string, boolean>
  >({})
  const [batchVisibility, setBatchVisibility] = useState<
    Record<string, boolean>
  >({})

  const state = resolveFilteredTableState({
    isLoading: isUserLoading || filtered === undefined,
    canAccess: user?.role === "owner",
    hasRows: (filtered?.length ?? 0) > 0,
  })

  return (
    <FilteredTablePage
      className="flex-1 space-y-4 pb-6"
      filterBar={
        <InventoryFilterBar
          search={search}
          onSearchChange={setSearch}
          status={status}
          category={category}
          uom={uom}
          stock={stock}
          onFilterChange={(updates) => setFilters(updates)}
          hasActiveFilters={hasActiveFilters}
          onClear={clearFilters}
          inventoryVisibility={inventoryVisibility}
          onInventoryVisibilityChange={setInventoryVisibility}
          batchVisibility={batchVisibility}
          onBatchVisibilityChange={setBatchVisibility}
        />
      }
      state={state}
      skeleton={
        <SkeletonTable
          columns={[
            { label: "Product Name", type: "name" },
            ...INVENTORY_TABLE_COLUMNS,
          ]}
          actions="ellipsis"
          rowCount={11}
        />
      }
      table={
        <InventoryTableContainer
          products={filtered ?? []}
          columnVisibility={inventoryVisibility}
          onColumnVisibilityChange={setInventoryVisibility}
          batchColumnVisibility={batchVisibility}
          onBatchColumnVisibilityChange={setBatchVisibility}
        />
      }
      empty={
        <FilteredEmptyState
          isFiltered={Boolean(search || hasActiveFilters)}
          filteredIcon={<XCircleIcon weight="bold" size={16} />}
          emptyIcon={<ArchiveIcon weight="fill" size={16} />}
          filteredTitle="No products match your filters"
          emptyTitle="No products yet"
          filteredDescription="Try adjusting your search or filters."
          emptyDescription="Add your first inventory to get started."
        />
      }
    />
  )
}
