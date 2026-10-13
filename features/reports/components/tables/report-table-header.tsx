"use client"

import { ArrowDownIcon, ArrowUpIcon } from "@phosphor-icons/react"
import { flexRender, type Table as ReactTable } from "@tanstack/react-table"
import { TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { headClassName, sortButtonAlignClass } from "@/lib/table-alignment"
import { cn } from "@/lib/utils"

interface ReportTableHeaderProps<T> {
  table: ReactTable<T>
}

// Sortable table header shared by report tables. The two report tables had an
// identical 43-line header; only their row types differ.
export default function ReportTableHeader<T>({
  table,
}: ReportTableHeaderProps<T>) {
  return (
    <TableHeader>
      {table.getHeaderGroups().map((headerGroup) => (
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
                    <ArrowDownIcon size={14} weight="fill" aria-hidden="true" />
                  ) : null}
                </button>
              ) : (
                flexRender(header.column.columnDef.header, header.getContext())
              )}
            </TableHead>
          ))}
        </TableRow>
      ))}
    </TableHeader>
  )
}
