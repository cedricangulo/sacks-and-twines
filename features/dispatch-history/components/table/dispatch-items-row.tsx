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
import { formatCurrency, formatNumber } from "@/lib/formatters"
import { useDispatchItems } from "../../hooks/use-dispatch-items"
import type { DispatchItem } from "../../validation"

const columnHelper = createColumnHelper<DispatchItem>()

// Dispatched-items table for a single dispatch, shown in an expandable row with sorting and column toggling.
export default function DispatchItemsRow({
  dispatchId,
  columnVisibility,
  onColumnVisibilityChange,
}: {
  dispatchId: Id<"dispatches">
  columnVisibility: VisibilityState
  onColumnVisibilityChange: Dispatch<SetStateAction<VisibilityState>>
}) {
  const items = useDispatchItems(dispatchId)
  const [sorting, setSorting] = useState<SortingState>([
    { id: "productName", desc: false },
  ])

  const data = useMemo(() => items ?? [], [items])

  const columns = useMemo(
    () => [
      columnHelper.accessor("productName", {
        header: "Product Name",
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor("productSku", {
        header: "SKU Code",
        cell: (info) => <span className="font-mono">{info.getValue()}</span>,
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor("batchCode", {
        header: "Batch Code",
        cell: (info) => <span className="font-mono">{info.getValue()}</span>,
        sortingFn: "alphanumeric",
        enableHiding: false,
      }),
      columnHelper.accessor("dispatchQuantity", {
        header: "Qty",
        cell: (info) => {
          const row = info.row.original
          return (
            <span className="font-mono tabular-nums">
              {formatNumber(row.dispatchQuantity, {
                locale: "en-PH",
                maximumFractionDigits: 4,
              })}{" "}
              {row.dispatchUom}
            </span>
          )
        },
        sortingFn: "basic",
        id: "dispatchQuantity",
      }),
      columnHelper.accessor("quantityDeducted", {
        header: "Qty Deducted",
        cell: (info) => (
          <span className="font-mono tabular-nums">
            {formatNumber(info.getValue(), {
              locale: "en-PH",
              maximumFractionDigits: 4,
            })}
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
      columnHelper.accessor("lineTotal", {
        header: "Line Total",
        cell: (info) => (
          <span className="font-mono tabular-nums">
            {formatCurrency(info.getValue())}
          </span>
        ),
        sortingFn: "basic",
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
      <TableHeader className="border-b">
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow className="border-border/50" key={headerGroup.id}>
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
      <TableBody className="animate-fade-in">
        {items === undefined ? (
          Array.from({ length: 1 }).map((_, i) => (
            <TableRow className="h-15" key={i}>
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
            <TableRow className="animate-fade-in" key={row.id}>
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
              No items found for this dispatch.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
