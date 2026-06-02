"use client"

import { flexRender, type Table as ReactTable } from "@tanstack/react-table"
import { ArrowDown, ArrowUp } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Id } from "@/convex/_generated/dataModel"

// A staff user record as displayed in the table.
export interface StaffUser {
  _id: Id<"users">
  _creationTime: number
  email: string
  name?: string
  role?: "owner" | "staff"
  status?: "active" | "deactivated"
}

// Props for the staff table component.
interface StaffTableProps {
  table: ReactTable<StaffUser>
}

// Renders the staff user table from a TanStack table instance with sortable headers.
export default function StaffTable({ table }: StaffTableProps) {
  const rows = table.getRowModel().rows

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
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
                      <ArrowUp
                        size={16}
                        className="text-muted-foreground"
                        aria-hidden="true"
                      />
                    ) : header.column.getIsSorted() === "desc" ? (
                      <ArrowDown
                        size={16}
                        className="text-muted-foreground"
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
      <TableBody>
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
