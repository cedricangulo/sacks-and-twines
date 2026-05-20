"use client"

import { Building2, SearchX } from "lucide-react"
import { useState } from "react"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"
import SupplierFilterBar from "@/features/suppliers/components/supplier-filter-bar"
import SupplierTableContainer from "@/features/suppliers/components/supplier-table-container"
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

  return (
    <div className="flex-1 space-y-6">
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
      {isUserLoading || filtered === undefined ? (
        <Skeleton className="h-64 w-full" />
      ) : user?.role !== "owner" ? (
        <p className="text-sm text-muted-foreground">
          You don&apos;t have permission to access this page.
        </p>
      ) : filtered.length > 0 ? (
        <SupplierTableContainer
          suppliers={filtered}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
        />
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              {search || hasActiveFilters ? (
                <SearchX size={16} />
              ) : (
                <Building2 size={16} />
              )}
            </EmptyMedia>
            <EmptyTitle>
              {search || hasActiveFilters
                ? "No suppliers match your filters"
                : "No suppliers yet"}
            </EmptyTitle>
            <EmptyDescription>
              {search || hasActiveFilters
                ? "Try adjusting your search or filters."
                : "Add your first supplier to get started."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  )
}
