"use client"

import { useQuery } from "convex-helpers/react/cache"
import { PackageOpen, SearchX } from "lucide-react"
import { useState } from "react"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"
import InventoryFilterBar from "@/features/inventory/components/inventory-filter-bar"
import InventoryTable from "@/features/inventory/components/table/inventory-table"
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
    <div className="flex-1 space-y-6">
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
        <Skeleton className="h-64 w-full" />
      ) : user?.role !== "owner" ? (
        <p className="text-sm text-muted-foreground">
          You don&apos;t have permission to access this page.
        </p>
      ) : filtered.length > 0 ? (
        <InventoryTable
          products={filtered}
          columnVisibility={inventoryVisibility}
          onColumnVisibilityChange={setInventoryVisibility}
          batchColumnVisibility={batchVisibility}
          onBatchColumnVisibilityChange={setBatchVisibility}
        />
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              {search || hasActiveFilters ? (
                <SearchX size={16} />
              ) : (
                <PackageOpen size={16} />
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
