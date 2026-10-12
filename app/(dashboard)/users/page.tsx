"use client"

import { UsersIcon, XCircleIcon } from "@phosphor-icons/react"
import { useQuery } from "convex-helpers/react/cache"
import { useState } from "react"
import {
  FilteredEmptyState,
  FilteredTablePage,
} from "@/components/filtered-table-page"
import { resolveFilteredTableState } from "@/components/filtered-table-state"
import SkeletonTable from "@/components/ui/skeleton-table"
import { api } from "@/convex/_generated/api"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"
import StaffFilterBar from "@/features/users/components/staff-filter-bar"
import StaffTableContainer from "@/features/users/components/staff-table-container"
import { STAFF_TABLE_COLUMNS } from "@/features/users/constants"
import { useStaffFilters } from "@/features/users/hooks/use-staff-filters"

export default function UsersPage() {
  const { user, isLoading: isUserLoading, isAuthenticated } = useCurrentUser()
  const staff = useQuery(api.users.queries.list, isAuthenticated ? {} : "skip")
  const {
    search,
    setSearch,
    status,
    setFilters,
    filtered,
    hasActiveFilters,
    clearFilters,
  } = useStaffFilters(staff)

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
        <StaffFilterBar
          search={search}
          onSearchChange={setSearch}
          status={status}
          onFilterChange={(updates) =>
            setFilters(
              updates as Partial<{
                status: "all" | "active" | "deactivated"
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
          columns={[{ label: "Name", type: "text" }, ...STAFF_TABLE_COLUMNS]}
          actions="text"
        />
      }
      table={
        <StaffTableContainer
          staff={filtered ?? []}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
        />
      }
      empty={
        <FilteredEmptyState
          isFiltered={Boolean(search || hasActiveFilters)}
          filteredIcon={<XCircleIcon weight="bold" size={16} />}
          emptyIcon={<UsersIcon weight="fill" size={16} />}
          filteredTitle="No staff match your filters"
          emptyTitle="No staff yet"
          filteredDescription="Try adjusting your search or filters."
          emptyDescription="Create your first staff account to get started."
        />
      }
    />
  )
}
