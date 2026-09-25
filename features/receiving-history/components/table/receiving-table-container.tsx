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
import { useCallback, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/formatters"
import type { ReceivingBatch } from "../../validation"
import ReceivingBatchDetailsDialog from "../dialogs/receiving-batch-details-dialog"
import ReceivingActionsMenu from "./receiving-actions-menu"
import ReceivingTable from "./receiving-table"

const columnHelper = createColumnHelper<ReceivingBatch>()

// Right-aligned numeric/currency cell. Matches the established convention in
// `features/inventory/` — the `SkeletonCell` types `number` and `currency` also
// render right-aligned, so the skeleton and the loaded value agree.
const numericCell = "block w-full text-right font-mono tabular-nums"

interface ReceivingTableContainerProps {
  batches: ReceivingBatch[]
  columnVisibility: VisibilityState
  onColumnVisibilityChange: Dispatch<SetStateAction<VisibilityState>>
}

// Owns all TanStack configuration for the receiving history table.
export default function ReceivingTableContainer({
  batches,
  columnVisibility,
  onColumnVisibilityChange,
}: ReceivingTableContainerProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ])
  // `detailsFor` is intentionally kept after close instead of being nulled, so
  // the dialog animates out with its content intact — see the prop docs on
  // `ReceivingBatchDetailsDialog`. Only opening another row replaces it.
  const [detailsFor, setDetailsFor] = useState<ReceivingBatch | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const handleViewDetails = useCallback((batch: ReceivingBatch) => {
    setDetailsFor(batch)
    setDetailsOpen(true)
  }, [])

  const data = useMemo(() => batches ?? [], [batches])

  // Only the six columns you scan a stock-in log by live in the table. SKU,
  // supplier, quantity remaining, unit cost and receiver are reachable one
  // click away via the row actions menu, which keeps the table at ~864px —
  // narrow enough to fit without a horizontal scrollbar at any viewport, since
  // every cell below truncates rather than expanding its column.
  const columns = useMemo(
    () => [
      columnHelper.accessor("batchCode", {
        header: "Batch Code",
        cell: (info) => (
          <span className="font-mono tabular-nums">{info.getValue()}</span>
        ),
        sortingFn: "alphanumeric",
        enableHiding: false,
      }),
      columnHelper.accessor("productName", {
        header: "Product",
        cell: (info) => (
          <span
            className="block max-w-62.5 truncate font-medium"
            title={info.getValue()}
          >
            {info.getValue()}
          </span>
        ),
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor("quantityReceived", {
        meta: { align: "right" },
        header: "Qty Received",
        cell: (info) => (
          <span className={numericCell}>{formatNumber(info.getValue())}</span>
        ),
        sortingFn: "basic",
      }),
      columnHelper.accessor("totalProcurementCost", {
        meta: { align: "right" },
        header: "Total Cost",
        cell: (info) => (
          <span className={numericCell}>{formatCurrency(info.getValue())}</span>
        ),
        sortingFn: "basic",
      }),
      columnHelper.accessor((row) => row.createdAt ?? row._creationTime, {
        id: "createdAt",
        header: "Received At",
        cell: (info) => (
          <span className="text-muted-foreground">
            {formatDateTime(info.getValue())}
          </span>
        ),
        enableGlobalFilter: false,
        sortingFn: "basic",
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const status = info.getValue()
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
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          )
        },
        sortingFn: "alphanumeric",
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <ReceivingActionsMenu
            batch={row.original}
            onViewDetails={handleViewDetails}
          />
        ),
        enableSorting: false,
        enableHiding: false,
        enableGlobalFilter: false,
      }),
    ],
    // `handleViewDetails` is `useCallback([])`, so this stays a stable reference.
    [handleViewDetails]
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

  return (
    <>
      <ReceivingTable table={table} />
      <ReceivingBatchDetailsDialog
        batch={detailsFor}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </>
  )
}
