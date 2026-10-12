"use client"

import { PackageIcon } from "@phosphor-icons/react"
import { flexRender, type Table as ReactTable } from "@tanstack/react-table"
import { SortableTableHead } from "@/components/sortable-table-head"
import TableEmptyState from "@/components/table-empty-state"
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ReceivingBatch } from "../../validation"

interface ReceivingTableProps {
  table: ReactTable<ReceivingBatch>
}

// Pure render component for the receiving history table.
export default function ReceivingTable({ table }: ReceivingTableProps) {
  const rows = table.getRowModel().rows

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
            icon={<PackageIcon size={16} weight="fill" />}
            title="No stock-ins found"
            description="Try adjusting the date range or clearing your filters."
          />
        ) : (
          rows.map((row) => (
            <TableRow key={row.id} className="border-border/50">
              {row.getVisibleCells().map((cell) =>
                cell.column.id === "actions" ? (
                  <TableCell
                    key={cell.id}
                    className="w-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ) : (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                )
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
