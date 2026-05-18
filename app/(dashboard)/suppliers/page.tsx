"use client"

import { useConvexAuth } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import SupplierTableContainer from "@/features/suppliers/components/supplier-table-container"
import { useSearchFilter } from "@/lib/hooks/use-search-filter"

export default function SuppliersPage() {
  const { isAuthenticated } = useConvexAuth()
  const user = useQuery(
    api.users.queries.currentUser,
    isAuthenticated ? {} : "skip"
  )
  const suppliers = useQuery(
    api.suppliers.queries.list,
    isAuthenticated ? {} : "skip"
  )
  const [search, setSearch] = useSearchFilter()

  return (
    <>
      <Input
        placeholder="Search suppliers..."
        value={search}
        onChange={(e) => void setSearch(e.target.value)}
        className="max-w-sm"
      />
      {user === undefined || suppliers === undefined ? (
        <Skeleton className="h-64 w-full" />
      ) : user?.role !== "owner" ? (
        <p className="text-sm text-muted-foreground">
          You don&apos;t have permission to access this page.
        </p>
      ) : (
        <SupplierTableContainer suppliers={suppliers} search={search} />
      )}
    </>
  )
}
