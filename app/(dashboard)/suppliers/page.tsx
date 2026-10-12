"use client"

import { BuildingsIcon, XCircleIcon } from "@phosphor-icons/react"
import { useState } from "react"
import {
  FilteredEmptyState,
  FilteredTablePage,
} from "@/components/filtered-table-page"
import { resolveFilteredTableState } from "@/components/filtered-table-state"
import SkeletonTable from "@/components/ui/skeleton-table"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"
import SupplierFilterBar from "@/features/suppliers/components/supplier-filter-bar"
import SupplierTableContainer from "@/features/suppliers/components/supplier-table-container"
import { SUPPLIER_TABLE_COLUMNS } from "@/features/suppliers/constants"
import { useSupplierFilters } from "@/features/suppliers/hooks/use-supplier-filters"
import { useSuppliers } from "@/features/suppliers/hooks/use-suppliers"

export default function SuppliersPage() {
  const { user, isLoading: isUserLoading } = useCurrentUser()
  const suppliers = useSuppliers()
  const {
    search,
    setSearch,
    status,
    setFilters,
    filtered,
    hasActiveFilters,
    clearFilters,
  } = useSupplierFilters(suppliers)

  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({})

  const state = resolveFilteredTableState({
    isLoading: isUserLoading || filtered === undefined,
    canAccess: user?.role === "owner",
    hasRows: (filtered?.length ?? 0) > 0,
  })

  return (
    <FilteredTablePage
      filterBar={
        <SupplierFilterBar
          search={search}
          onSearchChange={setSearch}
          status={status}
          onFilterChange={(updates) =>
            setFilters(
              updates as Partial<{
                status: "all" | "active" | "archived"
              }>
            )
          }
          hasActiveFilters={hasActiveFilters}
          onClear={clearFilters}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
        />
      }
      state={state}
      skeleton={
        <SkeletonTable
          columns={[
            { label: "Company Name", type: "text" },
            ...SUPPLIER_TABLE_COLUMNS,
          ]}
          actions="ellipsis"
        />
      }
      table={
        <SupplierTableContainer
          suppliers={filtered ?? []}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
        />
      }
      empty={
        <FilteredEmptyState
          isFiltered={Boolean(search || hasActiveFilters)}
          filteredIcon={<XCircleIcon weight="bold" size={16} />}
          emptyIcon={<BuildingsIcon weight="fill" size={16} />}
          filteredTitle="No suppliers match your filters"
          emptyTitle="No suppliers yet"
          filteredDescription="Try adjusting your search or filters."
          emptyDescription="Add your first supplier to get started."
        />
      }
    />
  )
}
