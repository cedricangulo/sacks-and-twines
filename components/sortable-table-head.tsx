"use client"

import { ArrowDownIcon, ArrowUpIcon } from "@phosphor-icons/react"
import { flexRender, type Header } from "@tanstack/react-table"
import { TableHead } from "@/components/ui/table"
import { headClassName, sortButtonAlignClass } from "@/lib/table-alignment"
import { cn } from "@/lib/utils"

// Shared sortable column header cell. Every TanStack table renders the same
// head pattern (sort toggle with directional arrows or a plain label), so the
// cell lives here instead of being copy-pasted across table components.
export function SortableTableHead<TData, TValue = unknown>({
  header,
}: {
  header: Header<TData, TValue>
}) {
  return (
    <TableHead
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
          {flexRender(header.column.columnDef.header, header.getContext())}
          {header.column.getIsSorted() === "asc" ? (
            <ArrowUpIcon size={14} weight="fill" aria-hidden="true" />
          ) : header.column.getIsSorted() === "desc" ? (
            <ArrowDownIcon size={14} weight="fill" aria-hidden="true" />
          ) : null}
        </button>
      ) : (
        flexRender(header.column.columnDef.header, header.getContext())
      )}
    </TableHead>
  )
}
