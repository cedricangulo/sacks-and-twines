"use client"

import {
  CubeIcon,
  CurrencyDollarIcon,
  WarningCircleIcon,
  WarningIcon,
} from "@phosphor-icons/react"
import Link from "next/link"
import type { ReactNode } from "react"
import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/formatters"
import { getStockLevel } from "@/lib/stock-level"
import { cn } from "@/lib/utils"

// A stock alert row as returned by `dashboard.queries.summaryStats`.
interface StockAlert {
  productId: string
  productName: string
  skuCode: string
  currentQuantity: number
  lowStockThreshold: number
}

interface StatCardsProps {
  totalAssetValue: number | undefined
  activeProductCount: number | undefined
  categoryCount: number | undefined
  stockAlerts: StockAlert[] | undefined
  isLoading: boolean
}

interface StatTileProps {
  title: string
  count: number
  isLoading: boolean
  /** Deep link for the tile headline — e.g. `/inventory?stock=low_stock`. */
  href: string
  icon: ReactNode
  iconWrapperClassName: string
  emptyLabel?: string
  items?: StockAlert[]
  /** Shows remaining quantity next to each product name. */
  showQuantities?: boolean
}

/**
 * A single stat tile whose headline block links to a filtered view, with an
 * optional per-product list underneath.
 *
 * Only the headline is wrapped in the link — `Card` is a plain `div` with no
 * `render` prop (and `components/ui/` is shadcn-managed), so wrapping the whole
 * card would nest the per-item anchors inside it, which is invalid HTML.
 */
function StatTile({
  title,
  count,
  isLoading,
  href,
  icon,
  iconWrapperClassName,
  emptyLabel,
  items,
  showQuantities,
}: StatTileProps) {
  return (
    <Card size="sm">
      <CardContent>
        <div className="flex items-start justify-between gap-2">
          <Link
            href={href}
            transitionTypes={["nav-forward"]}
            data-cuelume-press="soft"
            data-cuelume-release="soft"
            aria-label={`${title}: ${count}. View list`}
            className="flex-1 p-2 -m-2 transition-colors cursor-pointer rounded-2xl hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="transition-colors type-label text-muted-foreground group-hover:text-foreground">
                  {title}
                </h4>
                {isLoading ? (
                  <Skeleton className="w-12 h-8 mt-1" />
                ) : (
                  <div className="font-mono type-h2 tabular-nums animate-fade-in">
                    {count}
                  </div>
                )}
              </div>
              <div className={cn("p-2 rounded-xl", iconWrapperClassName)}>
                {icon}
              </div>
            </div>
          </Link>
        </div>

        {items && !isLoading ? (
          items.length > 0 ? (
            <ul className="mt-2 space-y-1 animate-fade-in">
              {items.map((alert) => (
                <li key={alert.skuCode}>
                  <Link
                    href={`/inventory?search=${encodeURIComponent(alert.skuCode)}`}
                    data-cuelume-press="soft"
                    data-cuelume-release="soft"
                    className="block transition-colors rounded cursor-pointer type-body-small line-clamp-1 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    title={alert.productName}
                  >
                    {alert.productName}
                    {showQuantities ? (
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {" "}
                        · {alert.currentQuantity}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-green-500 type-body-small">{emptyLabel}</p>
          )
        ) : null}
      </CardContent>
    </Card>
  )
}

export default function StatCards({
  totalAssetValue,
  activeProductCount,
  // categoryCount,
  stockAlerts,
  isLoading,
}: StatCardsProps) {
  // Partition once — avoids 6 filter/map passes over `stockAlerts`. Same
  // classifier the banner and the inventory filters use, so a tile count always
  // matches the view its link opens.
  const { lowStock, outOfStock } = useMemo(() => {
    const low: StockAlert[] = []
    const out: StockAlert[] = []
    for (const a of stockAlerts ?? []) {
      const level = getStockLevel(a.currentQuantity, a.lowStockThreshold)
      if (level === "out_of_stock") out.push(a)
      else if (level === "low_stock") low.push(a)
    }
    return { lowStock: low, outOfStock: out }
  }, [stockAlerts])

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="grid gap-6">
        <Card size="sm">
          <CardContent>
            <div className="flex items-start justify-between">
              <div>
                <div className="type-label text-muted-foreground">
                  Total Asset Value
                </div>
                {isLoading ? (
                  <Skeleton className="h-9 w-36" />
                ) : (
                  <div className="font-mono type-h2 tabular-nums animate-fade-in">
                    {formatCurrency(totalAssetValue ?? 0, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                )}
              </div>
              <div className="p-2 rounded-xl bg-primary/10">
                <CurrencyDollarIcon
                  weight="fill"
                  className="size-6 text-primary"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent>
            <div className="flex items-start justify-between">
              <div>
                <div className="type-label text-muted-foreground">
                  Total Available SKU
                </div>
                {isLoading ? (
                  <Skeleton className="w-24 h-9" />
                ) : (
                  <div className="font-mono type-h2 tabular-nums animate-fade-in">
                    {activeProductCount ?? 0}
                    <span className="ml-1 type-caption text-muted-foreground">
                      SKUs
                    </span>
                  </div>
                )}
              </div>
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950">
                <CubeIcon
                  weight="fill"
                  className="size-6 text-emerald-800 dark:text-emerald-400"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <StatTile
          title="Low Stock"
          count={lowStock.length}
          isLoading={isLoading}
          href="/inventory?stock=low_stock"
          iconWrapperClassName="bg-amber-100 dark:bg-amber-950"
          icon={
            <WarningIcon
              weight="fill"
              className="size-6 text-amber-600 dark:text-amber-400"
            />
          }
          emptyLabel="None"
          items={lowStock}
          showQuantities
        />
        <StatTile
          title="Out of Stock"
          count={outOfStock.length}
          isLoading={isLoading}
          href="/inventory?stock=out_of_stock"
          iconWrapperClassName="bg-red-100 rounded-xl dark:bg-red-950"
          icon={
            <WarningCircleIcon
              weight="fill"
              className="text-red-600 size-6 dark:text-red-400"
            />
          }
          emptyLabel="None"
          items={outOfStock}
        />
      </div>
    </div>
  )
}
