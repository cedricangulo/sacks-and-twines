"use client"

import { flexRender, type Row } from "@tanstack/react-table"
import { ChevronDown } from "lucide-react"
import { TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { Product } from "../../validation"

interface InventoryTableRowProps {
  row: Row<Product>
  isExpanded: boolean
  onToggle: () => void
}

export default function InventoryTableRow({
  row,
  isExpanded,
  onToggle,
}: InventoryTableRowProps) {
  return (
    <TableRow
      key={row.id}
      className={cn(
        "cursor-pointer transition-colors"
        // row.original.status === "archived"
        //   ? "bg-amber-100 dark:bg-amber-950 hover:bg-amber-100/50 dark:hover:bg-amber-950/50"
        //   : "hover:bg-muted/20"
      )}
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
