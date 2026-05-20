"use client"

import { useQuery } from "convex-helpers/react/cache"
import { Package, SearchX } from "lucide-react"
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
import ProductCard from "@/features/products/components/product-card"
import ProductFilterBar from "@/features/products/components/product-filter-bar"
import { useProductFilters } from "@/features/products/hooks/use-product-filters"

export default function ProductsPage() {
  const { isAuthenticated } = useCurrentUser()
  const products = useQuery(
    api.products.queries.listDispatchReady,
    isAuthenticated ? {} : "skip"
  )
  const {
    search,
    setSearch,
    category,
    stock,
    sort,
    setFilters,
    filtered,
    hasActiveFilters,
    clearFilters,
  } = useProductFilters(products)

  return (
    <div className="flex-1 space-y-6">
      <ProductFilterBar
        search={search}
        onSearchChange={setSearch}
        category={category}
        stock={stock}
        sort={sort}
        onFilterChange={(updates) =>
          setFilters(
            updates as Partial<{
              category: "all" | "sacks" | "twines"
              stock: "all" | "in_stock" | "low_stock" | "out_of_stock"
              sort: "name_asc" | "name_desc" | "stock_desc" | "stock_asc"
            }>
          )
        }
        hasActiveFilters={hasActiveFilters}
        onClear={clearFilters}
      />
      {filtered === undefined ? (
        <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <div className="absolute bottom-0 left-0 z-20 w-full h-2/4 bg-linear-to-t from-background to-transparent" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-81 rounded-4xl" />
          ))}
        </div>
      ) : (
        <>
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {filtered.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          ) : hasActiveFilters || search ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX />
                </EmptyMedia>
                <EmptyTitle>No products found</EmptyTitle>
                <EmptyDescription>
                  Try adjusting your search or filters.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Package />
                </EmptyMedia>
                <EmptyTitle>No products available</EmptyTitle>
                <EmptyDescription>
                  No products match the current filters.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </>
      )}
    </div>
  )
}
