"use client"

import { ArchiveIcon, XCircleIcon } from "@phosphor-icons/react"
import { useQuery } from "convex-helpers/react/cache"
import { useState } from "react"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import SkeletonTable from "@/components/ui/skeleton-table"
import { api } from "@/convex/_generated/api"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"
import InventoryFilterBar from "@/features/inventory/components/inventory-filter-bar"
import InventoryTableContainer from "@/features/inventory/components/table/inventory-table-container"
import { INVENTORY_TABLE_COLUMNS } from "@/features/inventory/constants"
import { useInventoryFilters } from "@/features/inventory/hooks/use-inventory-filters"

export default function InventoryPage() {
  const { user, isLoading: isUserLoading, isAuthenticated } = useCurrentUser()
  const products = useQuery(
    api.products.queries.list,
    isAuthenticated ? {} : "skip"
  )
  const {
    search,
    setSearch,
    status,
    category,
    stock,
    setFilters,
    filtered,
    hasActiveFilters,
    clearFilters,
  } = useInventoryFilters(products)

  const [inventoryVisibility, setInventoryVisibility] = useState<
    Record<string, boolean>
  >({})
  const [batchVisibility, setBatchVisibility] = useState<
    Record<string, boolean>
  >({})

  return (
    <div className="flex-1 space-y-4">
      <InventoryFilterBar
        search={search}
        onSearchChange={setSearch}
        status={status}
        category={category}
        stock={stock}
        onFilterChange={(updates) =>
          setFilters(
            updates as Partial<{
              status: "all" | "active" | "archived"
              category: "all" | "sacks" | "twines"
              stock: "all" | "in_stock" | "low_stock" | "out_of_stock"
            }>
          )
        }
        hasActiveFilters={hasActiveFilters}
        onClear={clearFilters}
        inventoryVisibility={inventoryVisibility}
        onInventoryVisibilityChange={setInventoryVisibility}
        batchVisibility={batchVisibility}
        onBatchVisibilityChange={setBatchVisibility}
      />
      {isUserLoading || filtered === undefined ? (
        <SkeletonTable
          headers={[
            "Product Name",
            ...INVENTORY_TABLE_COLUMNS.map((c) => c.label),
          ]}
          actions="ellipsis"
        />
      ) : user?.role !== "owner" ? (
        <p className="type-body-small text-muted-foreground">
          You don&apos;t have permission to access this page.
        </p>
      ) : filtered.length > 0 ? (
        <InventoryTableContainer
          products={filtered}
          columnVisibility={inventoryVisibility}
          onColumnVisibilityChange={setInventoryVisibility}
          batchColumnVisibility={batchVisibility}
          onBatchColumnVisibilityChange={setBatchVisibility}
        />
      ) : (
        <Empty className="animate-fade-in">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              {search || hasActiveFilters ? (
                <XCircleIcon weight="bold" size={16} />
              ) : (
                <ArchiveIcon weight="fill" size={16} />
              )}
            </EmptyMedia>
            <EmptyTitle>
              {search || hasActiveFilters
                ? "No products match your filters"
                : "No products yet"}
            </EmptyTitle>
            <EmptyDescription>
              {search || hasActiveFilters
                ? "Try adjusting your search or filters."
                : "Add your first inventory to get started."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  )
}
