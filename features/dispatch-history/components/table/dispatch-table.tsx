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
import { ArrowDown, ArrowUp, PackageOpen } from "lucide-react"
import type { Dispatch, SetStateAction } from "react"
import { Fragment, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateTime } from "@/lib/formatters"
import type { Dispatch as DispatchType } from "../../validation"
import DispatchItemsRow from "./dispatch-items-row"
import DispatchTableRow from "./dispatch-table-row"

const columnHelper = createColumnHelper<DispatchType>()

interface DispatchTableProps {
  dispatches: DispatchType[]
  columnVisibility: VisibilityState
  onColumnVisibilityChange: Dispatch<SetStateAction<VisibilityState>>
  itemsColumnVisibility: VisibilityState
  onItemsColumnVisibilityChange: Dispatch<SetStateAction<VisibilityState>>
}

export default function DispatchTable({
  dispatches,
  columnVisibility,
  onColumnVisibilityChange,
  itemsColumnVisibility,
  onItemsColumnVisibilityChange,
}: DispatchTableProps) {
  const [expandedDispatchId, setExpandedDispatchId] = useState<string | null>(
    null
  )
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ])

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "expand",
        header: "",
        enableSorting: false,
        enableHiding: false,
        enableGlobalFilter: false,
      }),
      columnHelper.accessor("customerReference", {
        header: "Customer Ref",
        cell: (info) => (
          <span className="font-medium">
            {info.getValue() ?? (
              <span className="text-muted-foreground italic">-</span>
            )}
          </span>
        ),
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
      columnHelper.accessor("userName", {
        header: "User",
        cell: (info) => info.getValue(),
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor((row) => row.itemCount, {
        id: "itemCount",
        header: "Items",
        cell: (info) => (
          <span className="font-mono tabular-nums">{info.getValue()}</span>
        ),
        sortingFn: "basic",
        enableSorting: false,
      }),
      columnHelper.accessor((row) => row.createdAt ?? row._creationTime, {
        id: "createdAt",
        header: "Date",
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

  const data = useMemo(() => dispatches ?? [], [dispatches])

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
  const totalColumns = table.getAllLeafColumns().length

  const toggleExpand = (id: string) => {
    setExpandedDispatchId((prev) => (prev === id ? null : id))
  }

  if (rows.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PackageOpen size={16} />
          </EmptyMedia>
          <EmptyTitle>No dispatch history yet</EmptyTitle>
          <EmptyDescription>
            Dispatched orders will appear here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
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
                        <ArrowDown size={14} aria-hidden="true" />
                      ) : header.column.getIsSorted() === "desc" ? (
                        <ArrowUp size={14} aria-hidden="true" />
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
            <Fragment key={row.id}>
              <DispatchTableRow
                row={row}
                isExpanded={expandedDispatchId === row.original._id}
                onToggle={() => toggleExpand(row.original._id)}
              />
              {expandedDispatchId === row.original._id ? (
                <TableRow key={`${row.id}-items`}>
                  <TableCell colSpan={totalColumns} className="p-4">
                    <div className="overflow-hidden transition-all">
                      <DispatchItemsRow
                        dispatchId={row.original._id}
                        columnVisibility={itemsColumnVisibility}
                        onColumnVisibilityChange={onItemsColumnVisibilityChange}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
