"use client"

import { useQuery } from "convex-helpers/react/cache"
import { SearchX, Users } from "lucide-react"
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
import StaffFilterBar from "@/features/users/components/staff-filter-bar"
import StaffTableContainer from "@/features/users/components/staff-table-container"
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

  return (
    <div className="flex-1 space-y-6">
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
      {isUserLoading || filtered === undefined ? (
        <Skeleton className="h-64 w-full" />
      ) : user?.role !== "owner" ? (
        <p className="text-sm text-muted-foreground">
          You don&apos;t have permission to access this page.
        </p>
      ) : filtered.length > 0 ? (
        <StaffTableContainer
          staff={filtered}
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
                <Users size={16} />
              )}
            </EmptyMedia>
            <EmptyTitle>
              {search || hasActiveFilters
                ? "No staff match your filters"
                : "No staff yet"}
            </EmptyTitle>
            <EmptyDescription>
              {search || hasActiveFilters
                ? "Try adjusting your search or filters."
                : "Create your first staff account to get started."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  )
}
