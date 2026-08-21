"use client"

import { TrendDownIcon, TrendUpIcon } from "@phosphor-icons/react"
import { useMemo } from "react"

import { Badge } from "@/components/ui/badge"
import { Empty } from "@/components/ui/empty"
import type { SkeletonColumn } from "@/components/ui/skeleton-table"
import SkeletonTable from "@/components/ui/skeleton-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatNumber } from "@/lib/formatters"
import { classifyVelocity, type Velocity } from "../constants"

export interface ProductMovementItem {
  productId: string
  productName: string
  unitsSold: number
}

const VELOCITY_BADGE_VARIANT: Record<
  Velocity,
  "success" | "warning" | "destructive"
> = {
  High: "success",
  Medium: "warning",
  Low: "destructive",
}

function VelocityBadge({ velocity }: { velocity: Velocity }) {
  return (
    <Badge variant={VELOCITY_BADGE_VARIANT[velocity]} className="tabular-nums">
      {velocity}
    </Badge>
  )
}

function MovementTableHeader() {
  return (
    <TableRow className="hover:bg-transparent">
      <TableHead className="h-9 px-0 text-muted-foreground type-label">
        Product
      </TableHead>
      <TableHead className="h-9 px-0 text-center text-muted-foreground type-label">
        Units Sold
      </TableHead>
      <TableHead className="h-9 px-0 text-right text-muted-foreground type-label">
        Velocity
      </TableHead>
    </TableRow>
  )
}

const PLACEHOLDER_ROWS = Array.from({ length: 5 })

function MovementTableEmpty() {
  return (
    <Table>
      <TableHeader>
        <MovementTableHeader />
      </TableHeader>
      <TableBody>
        {PLACEHOLDER_ROWS.map((_, i) => (
          <TableRow key={i} className="hover:bg-transparent">
            <TableCell className="px-0" />
            <TableCell className="px-0" />
            <TableCell className="px-0" />
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function MovementTable({
  rows,
}: {
  rows: Array<ProductMovementItem & { velocity: Velocity }>
}) {
  return (
    <Table>
      <TableHeader>
        <MovementTableHeader />
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.productId} className="hover:bg-transparent">
            <TableCell className="px-0 font-medium">
              <span className="line-clamp-1">{row.productName}</span>
            </TableCell>
            <TableCell className="px-0 text-center tabular-nums">
              {formatNumber(row.unitsSold, {
                locale: "en-PH",
                useGrouping: true,
              })}
            </TableCell>
            <TableCell className="px-0 text-right">
              <VelocityBadge velocity={row.velocity} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function SectionHeading({
  icon,
  iconClassName,
  children,
}: {
  icon: React.ReactNode
  iconClassName: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className={iconClassName}>{icon}</span>
      <h4 className="font-heading text-sm font-medium">{children}</h4>
    </div>
  )
}

const MOVEMENT_SKELETON_COLUMNS: SkeletonColumn[] = [
  { label: "Product", type: "text" },
  { label: "Units Sold", type: "number" },
  { label: "Velocity", type: "badge" },
]

const header = (
  <div className="mb-4">
    <h3 className="font-heading text-base font-medium">Product Movement</h3>
    <p className="mt-0.5 text-sm text-muted-foreground">
      Fast- and slow-moving products based on units sold (This month)
    </p>
  </div>
)

export default function ProductMovement({
  data,
  isLoading,
}: {
  data: ProductMovementItem[] | undefined
  isLoading: boolean
}) {
  const { fast, slow } = useMemo(() => {
    if (!data) return { fast: [], slow: [] }
    const sorted = [...data].sort((a, b) => b.unitsSold - a.unitsSold)
    const maxUnits = sorted.length > 0 ? sorted[0].unitsSold : 0
    const withVelocity = sorted.map((p) => ({
      ...p,
      velocity: classifyVelocity(p.unitsSold, maxUnits),
    }))
    const fast = withVelocity.slice(0, 5)
    const fastIds = new Set(fast.map((p) => p.productId))
    const slow = [...withVelocity]
      .reverse()
      .filter((p) => !fastIds.has(p.productId))
      .slice(0, 5)
    return { fast, slow }
  }, [data])

  const body =
    isLoading || data === undefined ? (
      <>
        <SkeletonTable
          columns={MOVEMENT_SKELETON_COLUMNS}
          actions="none"
          rowCount={5}
        />
        <SkeletonTable
          columns={MOVEMENT_SKELETON_COLUMNS}
          actions="none"
          rowCount={5}
        />
      </>
    ) : data.length === 0 ? (
      <Empty className="md:col-span-2">No product movement data</Empty>
    ) : (
      <>
        <div>
          <SectionHeading
            icon={<TrendUpIcon weight="bold" className="size-4" />}
            iconClassName="text-emerald-600 dark:text-emerald-400"
          >
            Top 5 Fast-Moving
          </SectionHeading>
          {fast.length > 0 ? (
            <MovementTable rows={fast} />
          ) : (
            <MovementTableEmpty />
          )}
        </div>

        <div>
          <SectionHeading
            icon={<TrendDownIcon weight="bold" className="size-4" />}
            iconClassName="text-red-600 dark:text-red-400"
          >
            Top 5 Slow-Moving
          </SectionHeading>
          {slow.length > 0 ? (
            <MovementTable rows={slow} />
          ) : (
            <MovementTableEmpty />
          )}
        </div>
      </>
    )

  return (
    <div>
      {header}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">{body}</div>
    </div>
  )
}
