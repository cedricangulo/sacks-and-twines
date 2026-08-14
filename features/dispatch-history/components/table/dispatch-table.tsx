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
import type { Dispatch as DispatchType } from "../../validation"
import DispatchItemsRow from "./dispatch-items-row"
import DispatchTableRow from "./dispatch-table-row"

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
  const totalColumns = table.getAllLeafColumns().length

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
                        <ArrowDownIcon
                          size={14}
                          weight="fill"
                          aria-hidden="true"
                        />
                      ) : header.column.getIsSorted() === "desc" ? (
                        <ArrowUpIcon
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
                <EmptyTitle>No dispatch history yet</EmptyTitle>
                <EmptyDescription>
                  Dispatched orders will appear here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
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
                      <div className="overflow-hidden overflow-y-auto transition-all max-h-70">
                        <DispatchItemsRow
                          dispatchId={row.original._id}
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
