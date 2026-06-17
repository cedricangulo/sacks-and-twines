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
import { formatQuantity, formatTime } from "@/lib/formatters"
import type { ReportAdjustment } from "../../hooks/use-report-adjustments"
import ReportAdjustmentTable from "./report-adjustment-table"

const columnHelper = createColumnHelper<ReportAdjustment>()

interface ReportAdjustmentTableContainerProps {
  adjustments: ReportAdjustment[]
}

export default function ReportAdjustmentTableContainer({
  adjustments,
}: ReportAdjustmentTableContainerProps) {
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

  return <ReportAdjustmentTable table={table} />
}
