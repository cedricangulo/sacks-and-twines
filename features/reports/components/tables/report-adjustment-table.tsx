"use client"

import { ArrowDownIcon, ArrowUpIcon } from "@phosphor-icons/react"
import { flexRender, type Table as ReactTable } from "@tanstack/react-table"
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
import type { ReportAdjustment } from "../../hooks/use-report-adjustments"

interface ReportAdjustmentTableProps {
  table: ReactTable<ReportAdjustment>
}

export default function ReportAdjustmentTable({
  table,
}: ReportAdjustmentTableProps) {
  const headerGroups = table.getHeaderGroups()
  const rows = table.getRowModel().rows

  return (
    <Table>
      <TableHeader>
        {headerGroups.map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                key={header.id}
                className={headClassName(header.column.columnDef.meta)}
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
        {rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
