"use client"

import { ColumnsIcon } from "@phosphor-icons/react"
import type { Dispatch, SetStateAction } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// One labeled group of table columns in the visibility menu.
export interface ColumnVisibilityGroup {
  label: string
  columns: ReadonlyArray<{ id: string; label: string }>
  visibility: Record<string, boolean>
  onVisibilityChange: Dispatch<SetStateAction<Record<string, boolean>>>
}

interface ColumnVisibilityMenuProps {
  groups:
    | [ColumnVisibilityGroup]
    | [ColumnVisibilityGroup, ColumnVisibilityGroup]
  contentClassName?: string
}

// Column-visibility dropdown shared by filter bars. Single-group menus use the
// caller's width; two-group menus use the shared two-column layout. Centralizes
// the checkbox updater so every table preserves an explicitly hidden column.
export default function ColumnVisibilityMenu({
  groups,
  contentClassName,
}: ColumnVisibilityMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="secondary" />}>
        <ColumnsIcon weight="fill" className="text-muted-foreground" />
        Columns
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={
          contentClassName ??
          (groups.length > 1 ? "grid grid-cols-2 gap-4 min-w-100" : undefined)
        }
      >
        {groups.map((group) => (
          <DropdownMenuGroup key={group.label}>
            <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
            {group.columns.map((col) => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={group.visibility[col.id] ?? true}
                closeOnClick={false}
                onCheckedChange={(checked) =>
                  group.onVisibilityChange((prev) => ({
                    ...prev,
                    [col.id]: checked === undefined ? true : checked,
                  }))
                }
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
