"use client"

import type { SortingState } from "@tanstack/react-table"
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatTime } from "@/lib/formatters"
import type { ReportDispatch } from "../../hooks/use-report-dispatches"
import ReportDispatchTable from "./report-dispatch-table"

const columnHelper = createColumnHelper<ReportDispatch>()

interface ReportDispatchTableContainerProps {
  dispatches: ReportDispatch[]
}

export default function ReportDispatchTableContainer({
  dispatches,
}: ReportDispatchTableContainerProps) {
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
      columnHelper.accessor("orNumber", {
        header: "OR Number",
        cell: (info) => (
          <span className="font-mono tabular-nums">
            {info.getValue() ?? "-"}
          </span>
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

  return <ReportDispatchTable table={table} />
}
