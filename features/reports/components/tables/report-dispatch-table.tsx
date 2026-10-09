"use client"

import { ArrowDownIcon, ArrowUpIcon } from "@phosphor-icons/react"
import { flexRender, type Table as ReactTable } from "@tanstack/react-table"
import { Fragment } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import DispatchItemsTable from "@/features/dispatches/components/dispatch-items-table"
import DispatchTableRow from "@/features/dispatches/components/dispatch-table-row"
import { headClassName, sortButtonAlignClass } from "@/lib/table-alignment"
import { cn } from "@/lib/utils"
import type { ReportDispatch } from "../../hooks/use-report-dispatches"

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
  const headerGroups = table.getHeaderGroups()
  const rows = table.getRowModel().rows
  const totalColumns = table.getVisibleLeafColumns().length

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
                    <DispatchItemsTable dispatchId={row.original._id} />
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
