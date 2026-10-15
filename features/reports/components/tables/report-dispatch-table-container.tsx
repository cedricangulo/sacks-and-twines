"use client"

import type { SortingState } from "@tanstack/react-table"
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useCallback, useMemo, useState } from "react"
import { formatDateTime } from "@/lib/formatters"
import type { ReportDispatch } from "../../hooks/use-report-dispatches"
import ReportDispatchTable from "./report-dispatch-table"

const columnHelper = createColumnHelper<ReportDispatch>()

interface ReportDispatchTableContainerProps {
  dispatches: ReportDispatch[]
}

// Container owns all TanStack config for the reports dispatch table. Column set
// mirrors /dispatch-history so both surfaces read identically; the vestigial
// empty `actions` column there is omitted here to save width in the h-80 panel.
export default function ReportDispatchTableContainer({
  dispatches,
}: ReportDispatchTableContainerProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ])
  const [expandedDispatchId, setExpandedDispatchId] = useState<string | null>(
    null
  )

  const data = useMemo(() => dispatches ?? [], [dispatches])

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "expand",
        header: "",
        enableSorting: false,
        enableHiding: false,
        enableGlobalFilter: false,
      }),
      columnHelper.accessor("orNumber", {
        header: "OR Number",
        cell: (info) => (
          <span className="font-mono tabular-nums">
            {info.getValue() ?? "-"}
          </span>
        ),
        sortingFn: "alphanumeric",
        enableHiding: false,
      }),
      columnHelper.accessor("customerReference", {
        header: "Customer Ref",
        cell: (info) => (
          <span className="italic font-medium">{info.getValue() ?? "-"}</span>
        ),
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor("userName", {
        header: "Dispatched By",
        cell: (info) => info.getValue(),
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor((row) => row.itemCount ?? 0, {
        id: "itemCount",
        meta: { align: "right" },
        header: "Total Items",
        cell: (info) => (
          <span className="block w-full text-right font-mono tabular-nums">
            {info.getValue()}
          </span>
        ),
        sortingFn: "basic",
      }),
      columnHelper.accessor((row) => row.totalQuantity ?? 0, {
        id: "totalQuantity",
        meta: { align: "right" },
        header: "Total Qty",
        cell: (info) => (
          <span className="block w-full text-right font-mono tabular-nums">
            {info.getValue()}
          </span>
        ),
        sortingFn: "basic",
      }),
      columnHelper.accessor((row) => row.createdAt ?? row._creationTime, {
        id: "createdAt",
        header: "Dispatched At",
        cell: (info) => (
          <span className="text-muted-foreground">
            {formatDateTime(info.getValue())}
          </span>
        ),
        enableGlobalFilter: false,
        sortingFn: "basic",
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
    // Stable ids keep the expanded row attached to its dispatch across re-sorts.
    getRowId: (row) => row._id,
  })

  // Stable callback so rows don't see a new `onToggle` identity every render
  // (Scan: 20 row + 145 cell rerenders per tab click from this alone).
  const toggleExpand = useCallback((id: string) => {
    setExpandedDispatchId((prev) => (prev === id ? null : id))
  }, [])

  return (
    <ReportDispatchTable
      table={table}
      expandedDispatchId={expandedDispatchId}
      onToggle={toggleExpand}
    />
  )
}
