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
import { formatCurrency, formatTime } from "@/lib/formatters"
import type { ReportDispatch } from "../../hooks/use-report-dispatches"

const columnHelper = createColumnHelper<ReportDispatch>()

// Props for the report dispatch table
interface ReportDispatchTableProps {
  dispatches: ReportDispatch[]
}

// Simple dispatch table for the reports detail panel
export default function ReportDispatchTable({
  dispatches,
}: ReportDispatchTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ])

  const columns = useMemo(
    () => [
      columnHelper.accessor("customerReference", {
        header: "Ref",
        cell: (info) => (
          <span className="italic font-medium">{info.getValue() ?? "-"}</span>
        ),
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor("itemCount", {
        header: "Items",
        cell: (info) => (
          <span className="font-mono tabular-nums">{info.getValue()}</span>
        ),
        enableSorting: true,
        sortingFn: "basic",
      }),
      columnHelper.accessor("totalValue", {
        header: "Value",
        cell: (info) => (
          <span className="font-mono tabular-nums">
            {formatCurrency(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => (
          <Badge
            variant={
              info.getValue() === "completed" ? "success" : "destructive"
            }
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
        sortingFn: "basic",
      }),
    ],
    []
  )

  const table = useReactTable({
    data: dispatches,
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
