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
import DispatchItemsTable from "@/features/dispatches/components/dispatch-items-table"
import DispatchTableRow from "@/features/dispatches/components/dispatch-table-row"
import type { Dispatch as DispatchType } from "../../validation"

interface DispatchTableProps {
  table: ReactTable<DispatchType>
  expandedDispatchId: string | null
  onToggle: (id: string) => void
  itemsColumnVisibility: VisibilityState
  onItemsColumnVisibilityChange: Dispatch<SetStateAction<VisibilityState>>
}

export default function DispatchTable({
  table,
  expandedDispatchId,
  onToggle,
  itemsColumnVisibility,
  onItemsColumnVisibilityChange,
}: DispatchTableProps) {
  const rows = table.getRowModel().rows
  const totalColumns = table.getVisibleLeafColumns().length

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
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
              title="No dispatch history yet"
              description="Dispatched orders will appear here."
            />
          ) : (
            rows.map((row) => (
              <Fragment key={row.id}>
                <DispatchTableRow
                  row={row}
                  isExpanded={expandedDispatchId === row.original._id}
                  onToggle={() => onToggle(row.original._id)}
                />
                {expandedDispatchId === row.original._id ? (
                  <TableRow key={`${row.id}-items`}>
                    <TableCell
                      colSpan={totalColumns}
                      className="px-12 bg-muted/50"
                    >
                      <div className="overflow-hidden overflow-y-auto transition-[max-height] duration-200 max-h-70">
                        <DispatchItemsTable
                          dispatchId={row.original._id}
                          searchParamKey="dispatchItemSearch"
                          columnVisibility={itemsColumnVisibility}
                          onColumnVisibilityChange={
                            onItemsColumnVisibilityChange
                          }
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
    </div>
  )
}
