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
import { ArrowDown, ArrowUp, Loader2Icon } from "lucide-react"
import type { Dispatch, SetStateAction } from "react"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
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
          <span className="font-mono tabular-nums">
            {formatNumber(info.getValue())}
          </span>
        ),
        sortingFn: "basic",
      }),
      columnHelper.accessor("quantityRemaining", {
        header: "Qty Remaining",
        cell: (info) => (
          <span className="font-mono tabular-nums">
            {formatNumber(info.getValue())}
          </span>
        ),
        sortingFn: "basic",
      }),
      columnHelper.accessor("unitCost", {
        header: "Unit Cost",
        cell: (info) => (
          <span className="font-mono tabular-nums">
            {formatCurrency(info.getValue())}
          </span>
        ),
        sortingFn: "basic",
      }),
      columnHelper.accessor("totalProcurementCost", {
        header: "Total Cost",
        cell: (info) => (
          <span className="font-mono tabular-nums">
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

  if (batches === undefined) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2Icon size={20} className="mr-2 animate-spin" />
        Loading batches&hellip;
      </div>
    )
  }

  const rows = table.getRowModel().rows

  return (
    <Table>
      <TableHeader className="border-b">
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
        {rows.length ? (
          rows.map((row) => (
            <TableRow key={row.id}>
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
