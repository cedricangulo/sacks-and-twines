"use client"

import { flexRender, type Table as ReactTable } from "@tanstack/react-table"
import { Fragment } from "react"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import DispatchItemsTable from "@/features/dispatches/components/dispatch-items-table"
import DispatchTableRow from "@/features/dispatches/components/dispatch-table-row"
import type { ReportDispatch } from "../../hooks/use-report-dispatches"
import ReportTableHeader from "./report-table-header"

interface ReportDispatchTableProps {
  table: ReactTable<ReportDispatch>
  expandedDispatchId: string | null
  onToggle: (id: string) => void
}

export default function ReportDispatchTable({
  table,
  expandedDispatchId,
  onToggle,
}: ReportDispatchTableProps) {
  const rows = table.getRowModel().rows
  const totalColumns = table.getVisibleLeafColumns().length

  return (
    <Table>
      <ReportTableHeader table={table} />
      <TableBody className="animate-fade-in">
        {rows.map((row) => (
          <Fragment key={row.id}>
            <DispatchTableRow
              row={row}
              isExpanded={expandedDispatchId === row.original._id}
              onToggle={() => onToggle(row.original._id)}
            />
            {expandedDispatchId === row.original._id ? (
              <TableRow key={`${row.id}-items`}>
                <TableCell colSpan={totalColumns} className="px-6 bg-muted/50">
                  <div className="overflow-hidden overflow-y-auto transition-[max-height] duration-200 max-h-70">
                    <DispatchItemsTable
                      dispatchId={row.original._id}
                      searchParamKey="reportItemSearch"
                    />
                  </div>
                </TableCell>
              </TableRow>
            ) : null}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  )
}
