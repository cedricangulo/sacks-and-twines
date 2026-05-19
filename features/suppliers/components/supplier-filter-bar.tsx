import { Columns3, SearchIcon, XIcon } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { STATUS_OPTIONS, SUPPLIER_TABLE_COLUMNS } from "../constants"

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
        <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
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
        <SelectTrigger className="w-27">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary">
            <Columns3 className="text-muted-foreground" />
            Columns
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Appearance</DropdownMenuLabel>
            {SUPPLIER_TABLE_COLUMNS.map((col) => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={columnVisibility[col.id] ?? true}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={(checked) =>
                  onColumnVisibilityChange((prev) => ({
                    ...prev,
                    [col.id]: checked === undefined ? true : checked,
                  }))
                }
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {hasActiveFilters ? (
        <Button type="button" variant="ghost" onClick={onClear}>
          <XIcon />
          Clear
        </Button>
      ) : null}
    </div>
  )
}
