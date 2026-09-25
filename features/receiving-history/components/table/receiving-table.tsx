"use client"

import { ArrowDownIcon, ArrowUpIcon, PackageIcon } from "@phosphor-icons/react"
import { flexRender, type Table as ReactTable } from "@tanstack/react-table"
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
import { headClassName, sortButtonAlignClass } from "@/lib/table-alignment"
import { cn } from "@/lib/utils"
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
              <TableHead
                key={header.id}
                className={headClassName(header.column.columnDef.meta)}
                colSpan={header.colSpan}
              >
                {header.isPlaceholder ? null : header.column.getCanSort() ? (
                  <button
                    data-cuelume-toggle="toggle"
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1",
                      sortButtonAlignClass(header.column.columnDef.meta)
                    )}
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
                <PackageIcon size={16} weight="fill" />
              </EmptyMedia>
              <EmptyTitle>No stock-ins found</EmptyTitle>
              <EmptyDescription>
                Try adjusting the date range or clearing your filters.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
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
