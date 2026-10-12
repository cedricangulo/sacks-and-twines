import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react"
import type { Dispatch, SetStateAction } from "react"
import ColumnVisibilityMenu from "@/components/column-visibility-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { STATUS_OPTIONS, SUPPLIER_TABLE_COLUMNS } from "../constants"

// Props for the supplier filter bar.
interface Props {
  search: string
  onSearchChange: (value: string) => void
  status: "all" | "active" | "archived"
  onFilterChange: (
    filters: Partial<{
      status: "all" | "active" | "archived"
    }>
  ) => void
  hasActiveFilters: boolean
  onClear: () => void
  columnVisibility: Record<string, boolean>
  onColumnVisibilityChange: Dispatch<SetStateAction<Record<string, boolean>>>
}

// Search, status filter, and column visibility controls for the supplier table.
export default function SupplierFilterBar({
  search,
  onSearchChange,
  status,
  onFilterChange,
  hasActiveFilters,
  onClear,
  columnVisibility,
  onColumnVisibilityChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative max-w-xs grow">
        <MagnifyingGlassIcon
          weight="bold"
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Search suppliers..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select
        value={status}
        onValueChange={(v) =>
          onFilterChange({
            status: v as "all" | "active" | "archived",
          })
        }
      >
        <SelectTrigger className="w-34">
          <SelectValue>
            {STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ColumnVisibilityMenu
        groups={[
          {
            label: "Appearance",
            columns: SUPPLIER_TABLE_COLUMNS,
            visibility: columnVisibility,
            onVisibilityChange: onColumnVisibilityChange,
          },
        ]}
      />

      {hasActiveFilters ? (
        <Button type="button" variant="ghost" onClick={onClear}>
          <XIcon weight="bold" />
          Clear
        </Button>
      ) : null}
    </div>
  )
}
