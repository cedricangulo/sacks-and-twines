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

  if (items === undefined) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2Icon size={20} className="mr-2 animate-spin" />
        Loading items&hellip;
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
              No items found for this dispatch.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
