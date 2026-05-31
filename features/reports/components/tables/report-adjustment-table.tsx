"use client"

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp } from "lucide-react"
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
import { formatQuantity, formatTime } from "@/lib/formatters"
import type { ReportAdjustment } from "../../hooks/use-report-adjustments"

const columnHelper = createColumnHelper<ReportAdjustment>()

/** Props for the report adjustment table. */
interface ReportAdjustmentTableProps {
  adjustments: ReportAdjustment[]
}

/** Simple stock adjustment table for the reports detail panel. */
export default function ReportAdjustmentTable({
  adjustments,
}: ReportAdjustmentTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ])

  const columns = useMemo(
    () => [
      columnHelper.accessor("productName", {
        header: "Product",
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor("reason", {
        header: "Reason",
        cell: (info) => {
          const reason = info.getValue()
          const variant =
            reason === "damaged" || reason === "lost"
              ? "destructive"
              : "secondary"
          return <Badge variant={variant}>{reason.replace("_", " ")}</Badge>
        },
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor("quantityAdjusted", {
        header: "Qty",
        cell: (info) => (
          <span className="font-mono tabular-nums">
            {formatQuantity(info.getValue())}
          </span>
        ),
        enableSorting: true,
        sortingFn: "basic",
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => (
          <Badge
            variant={info.getValue() === "applied" ? "default" : "destructive"}
          >
            {info.getValue()}
          </Badge>
        ),
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor((row) => row.createdAt ?? row._creationTime, {
        id: "createdAt",
        header: "Time",
        cell: (info) => (
          <span className="text-muted-foreground">
            {formatTime(info.getValue())}
          </span>
        ),
        enableSorting: true,
        sortingFn: "datetime",
      }),
    ],
    []
  )

  const table = useReactTable({
    data: adjustments,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    isMultiSortEvent: () => false,
    enableSortingRemoval: false,
  })

  const headerGroups = table.getHeaderGroups()
  const rows = table.getRowModel().rows

  return (
    <Table>
      <TableHeader>
        {headerGroups.map((headerGroup) => (
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
        {rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
