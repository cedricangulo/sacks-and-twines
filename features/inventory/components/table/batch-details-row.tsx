"use client"

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, Loader2Icon } from "lucide-react"
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
import { useBatches } from "../../hooks/use-batches"
import type { Batch } from "../../validation"
import BatchActionsMenu from "./batch-actions-menu"

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value)

const formatDate = (timestamp: number) =>
  new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp))

const columnHelper = createColumnHelper<Batch>()

export default function BatchDetailsRow({
  productId,
}: {
  productId: Id<"products">
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
      }),
      columnHelper.accessor("quantityReceived", {
        header: "Qty Received",
        cell: (info) => (
          <span className="font-mono tabular-nums">{info.getValue()}</span>
        ),
        sortingFn: "basic",
      }),
      columnHelper.accessor("quantityRemaining", {
        header: "Qty Remaining",
        cell: (info) => (
          <span className="font-mono tabular-nums">{info.getValue()}</span>
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
      columnHelper.accessor("_creationTime", {
        id: "createdAt",
        header: "Created",
        cell: (info) => formatDate(info.getValue()),
        enableGlobalFilter: false,
        sortingFn: "basic",
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => <BatchActionsMenu batch={row.original} />,
        enableSorting: false,
        enableGlobalFilter: false,
      }),
    ],
    []
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
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
        Loading batches...
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
