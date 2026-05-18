"use client"

import { useConvexAuth } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import StaffTableContainer from "@/features/users/components/staff-table-container"
import { useSearchFilter } from "@/lib/hooks/use-search-filter"

export default function UsersPage() {
  const { isAuthenticated } = useConvexAuth()
  const user = useQuery(
    api.users.queries.currentUser,
    isAuthenticated ? {} : "skip"
  )
  const staff = useQuery(api.users.queries.list, isAuthenticated ? {} : "skip")
  const [search, setSearch] = useSearchFilter()

  return (
    <>
      <Input
        placeholder="Search staff..."
        value={search}
        onChange={(e) => void setSearch(e.target.value)}
        className="max-w-sm"
      />
      {user === undefined || staff === undefined ? (
        <Skeleton className="h-64 w-full" />
      ) : user?.role !== "owner" ? (
        <p className="text-sm text-muted-foreground">
          You don&apos;t have permission to access this page.
        </p>
      ) : (
        <StaffTableContainer staff={staff} search={search} />
      )}
    </>
  )
}
