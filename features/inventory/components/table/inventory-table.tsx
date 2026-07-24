"use client"

import { ArchiveIcon, ArrowDownIcon, ArrowUpIcon } from "@phosphor-icons/react"
import type { VisibilityState } from "@tanstack/react-table"
import { flexRender, type Table as ReactTable } from "@tanstack/react-table"
import type { Dispatch, SetStateAction } from "react"
import { Fragment } from "react"
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
import type { Product } from "../../validation"
import BatchDetailsRow from "./batch-details-row"
import InventoryTableRow from "./inventory-table-row"

interface InventoryTableProps {
  table: ReactTable<Product>
  expandedProductId: string | null
  onToggle: (productId: string) => void
  batchColumnVisibility: VisibilityState
  onBatchColumnVisibilityChange: Dispatch<SetStateAction<VisibilityState>>
}

export default function InventoryTable({
  table,
  expandedProductId,
  onToggle,
  batchColumnVisibility,
  onBatchColumnVisibilityChange,
}: InventoryTableProps) {
  const rows = table.getRowModel().rows
  const totalColumns = table.getAllLeafColumns().length

  return (
    <Table>
      <TableHeader>
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
                      <ArrowUpIcon size={14} weight="fill" aria-hidden="true" />
                    ) : header.column.getIsSorted() === "desc" ? (
                      <ArrowDownIcon
                        size={14}
                        weight="fill"
                        aria-hidden="true"
                      />
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
        {rows.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ArchiveIcon size={16} weight="fill" />
              </EmptyMedia>
              <EmptyTitle>No products yet</EmptyTitle>
              <EmptyDescription>
                Add your first inventory to get started.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          rows.map((row) => (
            <Fragment key={row.id}>
              <InventoryTableRow
                row={row}
                onToggle={() => onToggle(row.original._id)}
              />
              {expandedProductId === row.original._id ? (
                <TableRow
                  className="border-border/50 animate-fade-in"
                  key={`${row.id}-batches`}
                >
                  <TableCell colSpan={totalColumns} className="p-4">
                    <div className="overflow-hidden overflow-y-auto transition-all max-h-70">
                      <BatchDetailsRow
                        productId={row.original._id}
                        columnVisibility={batchColumnVisibility}
                        onColumnVisibilityChange={onBatchColumnVisibilityChange}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
            </Fragment>
          ))
        )}
      </TableBody>
    </Table>
  )
}
