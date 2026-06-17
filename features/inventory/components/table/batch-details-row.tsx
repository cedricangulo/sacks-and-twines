"use client"

import type { VisibilityState } from "@tanstack/react-table"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, EllipsisVertical } from "lucide-react"
import type { Dispatch, ReactNode, SetStateAction } from "react"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
import { useBatches } from "../../hooks/use-batches"
import type { Batch } from "../../validation"
import BatchActionsMenu from "./batch-actions-menu"

const columnHelper = createColumnHelper<Batch>()

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

  const data = useMemo(() => batches ?? [], [batches])

  const columns = useMemo(
    () => [
      columnHelper.accessor("batchCode", {
        header: "Batch Code",
        cell: (info) => <span className="font-mono">{info.getValue()}</span>,
        sortingFn: "alphanumeric",
        enableHiding: false,
      }),
      columnHelper.accessor("quantityReceived", {
        header: "Qty Received",
        cell: (info) => (
          <span className="block w-full text-right font-mono tabular-nums">
            {formatNumber(info.getValue())}
          </span>
        ),
        sortingFn: "basic",
      }),
      columnHelper.accessor("quantityRemaining", {
        header: "Qty Remaining",
        cell: (info) => (
          <span className="block w-full text-right font-mono tabular-nums">
            {formatNumber(info.getValue())}
          </span>
        ),
        sortingFn: "basic",
      }),
      columnHelper.accessor("unitCost", {
        header: "Unit Cost",
        cell: (info) => (
          <span className="block w-full text-right font-mono tabular-nums">
            {formatCurrency(info.getValue())}
          </span>
        ),
        sortingFn: "basic",
      }),
      columnHelper.accessor("totalProcurementCost", {
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
    <Table>
      <TableHeader className="border-b border-border/50">
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id} className="text-muted-foreground">
                {header.isPlaceholder ? null : header.column.getCanSort() ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    {header.column.getIsSorted() === "asc" ? (
                      <ArrowUp size={14} aria-hidden="true" />
                    ) : header.column.getIsSorted() === "desc" ? (
                      <ArrowDown size={14} aria-hidden="true" />
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
            <TableRow className="border-border/50 h-15" key={i}>
              {table.getAllLeafColumns().reduce<ReactNode[]>((acc, col) => {
                if (!col.getIsVisible()) return acc
                acc.push(
                  <TableCell key={col.id}>
                    {col.id === "actions" ? (
                      <EllipsisVertical
                        size={16}
                        className="text-muted-foreground"
                      />
                    ) : (
                      <Skeleton className="w-20 h-4" />
                    )}
                  </TableCell>
                )
                return acc
              }, [])}
            </TableRow>
          ))
        ) : rows.length ? (
          rows.map((row) => (
            <TableRow className="border-border/50 animate-fade-in" key={row.id}>
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
              No batches found for this product.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
