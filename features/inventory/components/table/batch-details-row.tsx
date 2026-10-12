"use client"

import {
  ArrowDownIcon,
  ArrowUpIcon,
  DotsThreeVerticalIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "@phosphor-icons/react"
import type { VisibilityState } from "@tanstack/react-table"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { parseAsString, useQueryState } from "nuqs"
import type { Dispatch, ReactNode, SetStateAction } from "react"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  SkeletonCell,
  type SkeletonCellType,
} from "@/components/ui/skeleton-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Id } from "@/convex/_generated/dataModel"
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/formatters"
import { matchesNumber, matchesSearch, normalizeSearchTerm } from "@/lib/search"
import { headClassName, sortButtonAlignClass } from "@/lib/table-alignment"
import { cn } from "@/lib/utils"
import { useBatches } from "../../hooks/use-batches"
import type { Batch } from "../../validation"
import BatchActionsMenu from "./batch-actions-menu"

const columnHelper = createColumnHelper<Batch>()

// Skeleton cell shape per column id so loading rows mirror the real cells.
const SKELETON_BY_COLUMN_ID: Record<string, SkeletonCellType> = {
  batchCode: "mono",
  quantityReceived: "number",
  quantityRemaining: "number",
  unitCost: "currency",
  totalProcurementCost: "currency",
  status: "badge",
  createdAt: "date",
}

// Batches table for a single product, shown in an expandable row with sorting and column toggling.
export default function BatchDetailsRow({
  productId,
  columnVisibility,
  onColumnVisibilityChange,
}: {
  productId: Id<"products">
  columnVisibility: VisibilityState
  onColumnVisibilityChange: Dispatch<SetStateAction<VisibilityState>>
}) {
  const batches = useBatches(productId)
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ])

  // Search is URL-synced like every other filter in the app, so a batch search
  // survives a refresh and can be shared as a link.
  //
  // Scoped to the expanded product's batches, not global: finding a batch code
  // means expanding the product that owns it. A global batch-code search would
  // need a server-side scan over `batches`, which no index can serve — and
  // filtering after pagination is exactly the bug `listHistory` avoids with its
  // compound indexes.
  const [rawSearch, setSearch] = useQueryState(
    "batchSearch",
    parseAsString.withDefault("").withOptions({ history: "replace" })
  )
  const search = normalizeSearchTerm(rawSearch)

  // Every rendered column is searchable, so batch code, quantities, costs,
  // status and the created date can all be found from the keyboard.
  const data = useMemo(() => {
    if (!batches) return []
    if (!search) return batches
    return batches.filter(
      (b) =>
        matchesSearch(b.batchCode, search) ||
        matchesSearch(b.status, search) ||
        matchesNumber(b.quantityReceived, search) ||
        matchesNumber(b.quantityRemaining, search) ||
        matchesNumber(b.unitCost, search) ||
        matchesSearch(formatCurrency(b.unitCost), search) ||
        matchesNumber(b.totalProcurementCost, search) ||
        matchesSearch(formatCurrency(b.totalProcurementCost), search) ||
        matchesSearch(formatDateTime(b.createdAt ?? b._creationTime), search)
    )
  }, [batches, search])

  const columns = useMemo(
    () => [
      columnHelper.accessor("batchCode", {
        header: "Batch Code",
        cell: (info) => <span className="font-mono">{info.getValue()}</span>,
        sortingFn: "alphanumeric",
        enableHiding: false,
      }),
      columnHelper.accessor("quantityReceived", {
        meta: { align: "right" },
        header: "Qty Received",
        cell: (info) => (
          <span className="block w-full text-right font-mono tabular-nums">
            {formatNumber(info.getValue())}
          </span>
        ),
        sortingFn: "basic",
      }),
      columnHelper.accessor("quantityRemaining", {
        meta: { align: "right" },
        header: "Qty Remaining",
        cell: (info) => (
          <span className="block w-full text-right font-mono tabular-nums">
            {formatNumber(info.getValue())}
          </span>
        ),
        sortingFn: "basic",
      }),
      columnHelper.accessor("unitCost", {
        meta: { align: "right" },
        header: "Unit Cost",
        cell: (info) => (
          <span className="block w-full text-right font-mono tabular-nums">
            {formatCurrency(info.getValue())}
          </span>
        ),
        sortingFn: "basic",
      }),
      columnHelper.accessor("totalProcurementCost", {
        meta: { align: "right" },
        header: "Total Cost",
        cell: (info) => (
          <span className="block w-full text-right font-mono tabular-nums">
            {formatCurrency(info.getValue())}
          </span>
        ),
        sortingFn: "basic",
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status
          return (
            <Badge
              variant={
                status === "active"
                  ? "success"
                  : status === "depleted"
                    ? "secondary"
                    : "destructive"
              }
            >
              {status === "active"
                ? "Active"
                : status === "depleted"
                  ? "Depleted"
                  : "Voided"}
            </Badge>
          )
        },
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor((row) => row.createdAt ?? row._creationTime, {
        id: "createdAt",
        header: "Created",
        cell: (info) => (
          <span className="text-muted-foreground">
            {formatDateTime(info.getValue())}
          </span>
        ),
        enableGlobalFilter: false,
        sortingFn: "basic",
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => <BatchActionsMenu batch={row.original} />,
        enableSorting: false,
        enableHiding: false,
        enableGlobalFilter: false,
      }),
    ],
    []
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
    enableSortingRemoval: false,
    isMultiSortEvent: () => false,
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row._id,
  })

  const rows = table.getRowModel().rows

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative max-w-64 grow">
          <MagnifyingGlassIcon
            weight="bold"
            className="absolute -translate-y-1/2 left-3 top-1/2 size-4 text-muted-foreground"
          />
          <Input
            aria-label="Search this product's batches"
            placeholder="Search batches..."
            value={rawSearch}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-9"
          />
        </div>
        {search ? (
          <Button
            aria-label="Clear batch search"
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => setSearch("")}
          >
            <XIcon weight="bold" />
            Clear
          </Button>
        ) : null}
      </div>

      <Table>
        <TableHeader className="border-b border-border/50">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={headClassName(header.column.columnDef.meta)}
                >
                  {header.isPlaceholder ? null : header.column.getCanSort() ? (
                    <button
                      data-cuelume-toggle="toggle"
                      type="button"
                      className={cn(
                        "inline-flex items-center gap-1",
                        sortButtonAlignClass(header.column.columnDef.meta)
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getIsSorted() === "asc" ? (
                        <ArrowUpIcon
                          size={14}
                          weight="fill"
                          aria-hidden="true"
                        />
                      ) : header.column.getIsSorted() === "desc" ? (
                        <ArrowDownIcon
                          size={14}
                          weight="fill"
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
                  ) : (
                    flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {batches === undefined ? (
            Array.from({ length: 4 }).map((_, i) => (
              <TableRow className="border-border/50" key={i}>
                {table.getAllLeafColumns().reduce<ReactNode[]>((acc, col) => {
                  if (!col.getIsVisible()) return acc
                  acc.push(
                    <TableCell key={col.id}>
                      {col.id === "actions" ? (
                        <DotsThreeVerticalIcon
                          size={16}
                          weight="bold"
                          className="text-muted-foreground"
                        />
                      ) : (
                        <SkeletonCell
                          type={SKELETON_BY_COLUMN_ID[col.id] ?? "text"}
                        />
                      )}
                    </TableCell>
                  )
                  return acc
                }, [])}
              </TableRow>
            ))
          ) : rows.length ? (
            rows.map((row) => (
              <TableRow
                className="border-border/50 animate-fade-in"
                key={row.id}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={table.getAllLeafColumns().length}
                className="h-16 text-center text-muted-foreground"
              >
                {search ? (
                  <span>No batches match “{search}”.</span>
                ) : (
                  "No batches found for this product."
                )}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
