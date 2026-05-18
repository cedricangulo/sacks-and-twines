"use client"

import { useConvexAuth } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import InventoryTable from "@/features/inventory/components/table/inventory-table"
import { useSearchFilter } from "@/lib/hooks/use-search-filter"

export default function InventoryPage() {
  const { isAuthenticated } = useConvexAuth()
  const user = useQuery(
    api.users.queries.currentUser,
    isAuthenticated ? {} : "skip"
  )
  const products = useQuery(
    api.products.queries.list,
    isAuthenticated ? {} : "skip"
  )
  const [search, setSearch] = useSearchFilter()

  return (
    <>
      <Input
        placeholder="Search products..."
        value={search}
        onChange={(e) => void setSearch(e.target.value)}
        className="max-w-sm"
      />
      {user === undefined || products === undefined ? (
        <Skeleton className="h-64 w-full" />
      ) : user?.role !== "owner" ? (
        <p className="text-sm text-muted-foreground">
          You don&apos;t have permission to access this page.
        </p>
      ) : (
        <InventoryTable products={products} search={search} />
      )}
    </>
  )
}
