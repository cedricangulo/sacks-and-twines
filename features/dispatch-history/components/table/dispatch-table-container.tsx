"use client"

import type { VisibilityState } from "@tanstack/react-table"
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import type { Dispatch, SetStateAction } from "react"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/formatters"
import type { Dispatch as DispatchType } from "../../validation"
import DispatchTable from "./dispatch-table"

const columnHelper = createColumnHelper<DispatchType>()

interface DispatchTableContainerProps {
  dispatches: DispatchType[]
  columnVisibility: VisibilityState
  onColumnVisibilityChange: Dispatch<SetStateAction<VisibilityState>>
  itemsColumnVisibility: VisibilityState
  onItemsColumnVisibilityChange: Dispatch<SetStateAction<VisibilityState>>
}

export default function DispatchTableContainer({
  dispatches,
  columnVisibility,
  onColumnVisibilityChange,
  itemsColumnVisibility,
  onItemsColumnVisibilityChange,
}: DispatchTableContainerProps) {
  const [expandedDispatchId, setExpandedDispatchId] = useState<string | null>(
    null
  )
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ])

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
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const status = info.getValue()
          return (
            <Badge variant={status === "completed" ? "success" : "destructive"}>
              {status === "completed" ? "Completed" : "Voided"}
            </Badge>
          )
        },
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor((row) => row.itemCount, {
        id: "itemCount",
        header: "Total Items",
        cell: (info) => (
          <span className="font-mono tabular-nums">{info.getValue()}</span>
        ),
        sortingFn: "basic",
        enableSorting: false,
      }),
      columnHelper.accessor((row) => row.totalQuantity ?? 0, {
        id: "totalQuantity",
        header: "Total Qty",
        cell: (info) => (
          <span className="font-mono tabular-nums">{info.getValue()}</span>
        ),
        sortingFn: "basic",
        enableSorting: false,
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
      columnHelper.display({
        id: "actions",
        header: "",
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

  const toggleExpand = (id: string) => {
    setExpandedDispatchId((prev) => (prev === id ? null : id))
  }

  return (
    <DispatchTable
      table={table}
      expandedDispatchId={expandedDispatchId}
      onToggle={toggleExpand}
      itemsColumnVisibility={itemsColumnVisibility}
      onItemsColumnVisibilityChange={onItemsColumnVisibilityChange}
    />
  )
}
