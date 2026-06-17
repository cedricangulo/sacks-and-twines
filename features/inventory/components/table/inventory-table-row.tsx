"use client"

import { flexRender, type Row } from "@tanstack/react-table"
import { TableCell, TableRow } from "@/components/ui/table"
import type { Product } from "../../validation"

interface InventoryTableRowProps {
  row: Row<Product>
  onToggle: () => void
}

export default function InventoryTableRow({
  row,
  onToggle,
}: InventoryTableRowProps) {
  return (
    <TableRow
      key={row.id}
      className="cursor-pointer transition-colors border-border/50"
      onClick={onToggle}
    >
      {row.getVisibleCells().map((cell) => {
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
