"use client"

import { flexRender, type Table as ReactTable } from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import type { ReportAdjustment } from "../../hooks/use-report-adjustments"
import ReportTableHeader from "./report-table-header"

interface ReportAdjustmentTableProps {
  table: ReactTable<ReportAdjustment>
}

export default function ReportAdjustmentTable({
  table,
}: ReportAdjustmentTableProps) {
  const rows = table.getRowModel().rows

  return (
    <Table>
      <ReportTableHeader table={table} />
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
