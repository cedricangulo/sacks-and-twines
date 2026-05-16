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
        "cursor-pointer transition-colors hover:bg-muted/50",
        isExpanded && "bg-muted/30"
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
        return (
          <TableCell key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        )
      })}
    </TableRow>
  )
}
