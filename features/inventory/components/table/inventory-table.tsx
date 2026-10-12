"use client"

import { ArchiveIcon } from "@phosphor-icons/react"
import type { VisibilityState } from "@tanstack/react-table"
import { type Table as ReactTable } from "@tanstack/react-table"
import type { Dispatch, SetStateAction } from "react"
import { Fragment } from "react"
import { SortableTableHead } from "@/components/sortable-table-head"
import TableEmptyState from "@/components/table-empty-state"
import {
  Table,
  TableBody,
  TableCell,
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
              <SortableTableHead key={header.id} header={header} />
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody className="animate-fade-in">
        {rows.length === 0 ? (
          <TableEmptyState
            icon={<ArchiveIcon size={16} weight="fill" />}
            title="No products yet"
            description="Add your first inventory to get started."
          />
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
                  <TableCell
                    colSpan={totalColumns}
                    className="px-12 bg-muted/50"
                  >
                    <div className="overflow-hidden overflow-y-auto transition-[max-height] duration-200 max-h-70">
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
