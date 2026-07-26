"use client"

import {
  CubeIcon,
  CurrencyDollarIcon,
  WarningCircleIcon,
  WarningIcon,
} from "@phosphor-icons/react"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/formatters"

interface StatCardsProps {
  totalAssetValue: number | undefined
  activeProductCount: number | undefined
  categoryCount: number | undefined
  stockAlerts:
    | Array<{
        productName: string
        currentQuantity: number
      }>
    | undefined
  isLoading: boolean
}

export default function StatCards({
  totalAssetValue,
  activeProductCount,
  // categoryCount,
  stockAlerts,
  isLoading,
}: StatCardsProps) {
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
                  Total Active Products
                </div>
                {isLoading ? (
                  <Skeleton className="w-24 h-9" />
                ) : (
                  <div className="font-mono type-h2 tabular-nums animate-fade-in">
                    {activeProductCount ?? 0}{" "}
                    <span className="type-caption text-muted-foreground">
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
        <Card size="sm">
          <CardContent>
            <div className="flex items-start justify-between">
              <div>
                <h4 className="type-label text-muted-foreground">Low Stock</h4>
                {isLoading ? (
                  <Skeleton className="w-12 h-8" />
                ) : (
                  <div className="font-mono type-h2 tabular-nums animate-fade-in">
                    {stockAlerts?.filter((a) => a.currentQuantity > 0).length ??
                      0}
                  </div>
                )}
                {!isLoading &&
                stockAlerts &&
                stockAlerts.filter((a) => a.currentQuantity > 0).length > 0 ? (
                  <ul className="mt-2 space-y-1 animate-fade-in">
                    {stockAlerts
                      .filter((a) => a.currentQuantity > 0)
                      .map((alert) => (
                        <li
                          key={alert.productName}
                          title={alert.productName}
                          className="type-body-small line-clamp-1"
                        >
                          {alert.productName}
                        </li>
                      ))}
                  </ul>
                ) : !isLoading ? (
                  <p className="mt-2 text-green-500 type-body-small">None</p>
                ) : null}
              </div>
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950">
                <WarningIcon
                  weight="fill"
                  className="size-6 text-amber-600 dark:text-amber-400"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent>
            <div className="flex items-start justify-between">
              <div>
                <h4 className="type-label text-muted-foreground">
                  Out of Stock
                </h4>
                {isLoading ? (
                  <Skeleton className="w-12 h-8" />
                ) : (
                  <div className="font-mono type-h2 tabular-nums animate-fade-in">
                    {stockAlerts?.filter((a) => a.currentQuantity === 0)
                      .length ?? 0}
                  </div>
                )}
                {!isLoading &&
                stockAlerts &&
                stockAlerts.filter((a) => a.currentQuantity === 0).length >
                  0 ? (
                  <ul className="mt-2 space-y-1 animate-fade-in">
                    {stockAlerts
                      .filter((a) => a.currentQuantity === 0)
                      .map((alert) => (
                        <li
                          key={alert.productName}
                          title={alert.productName}
                          className="type-body-small line-clamp-1"
                        >
                          {alert.productName}
                        </li>
                      ))}
                  </ul>
                ) : !isLoading ? (
                  <p className="mt-2 text-green-500 type-body-small">None</p>
                ) : null}
              </div>
              <div className="p-2 bg-red-100 rounded-xl dark:bg-red-950">
                <WarningCircleIcon
                  weight="fill"
                  className="text-red-600 size-6 dark:text-red-400"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
