"use client"

import { flexRender, type Row } from "@tanstack/react-table"
import { ChevronDown } from "lucide-react"
import { TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { Dispatch } from "../../validation"

interface Props {
  row: Row<Dispatch>
  isExpanded: boolean
  onToggle: () => void
}

/** Single dispatch row with click-to-expand toggle and inline actions. */
export default function DispatchTableRow({ row, isExpanded, onToggle }: Props) {
  return (
    <TableRow
      key={row.id}
      className="cursor-pointer transition-colors"
      onClick={onToggle}
    >
      {row.getVisibleCells().map((cell) => {
        if (cell.column.id === "expand") {
          return (
            <TableCell key={cell.id} className="w-8 pr-0">
              <ChevronDown
                size={16}
                className={cn(
                  "text-muted-foreground transition-transform duration-200",
                  isExpanded && "rotate-180"
                )}
              />
            </TableCell>
          )
        }
        if (cell.column.id === "actions") {
          return (
            <TableCell
              key={cell.id}
              className="w-10"
              onClick={(e) => e.stopPropagation()}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          )
        }
        return (
          <TableCell key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        )
      })}
    </TableRow>
  )
}
