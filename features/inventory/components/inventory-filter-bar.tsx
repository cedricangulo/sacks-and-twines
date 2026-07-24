import { ColumnsIcon, MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react"
import type { Dispatch, SetStateAction } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  // DropdownMenuSeparator,
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
import {
  BATCH_TABLE_COLUMNS,
  CATEGORY_OPTIONS,
  INVENTORY_TABLE_COLUMNS,
  STATUS_OPTIONS,
  STOCK_OPTIONS,
} from "../constants"

// Props for the inventory filter bar.
interface Props {
  search: string
  onSearchChange: (value: string) => void
  status: "all" | "active" | "archived"
  category: "all" | "sacks" | "twines"
  stock: "all" | "in_stock" | "low_stock" | "out_of_stock"
  onFilterChange: (
    filters: Partial<{
      status: "all" | "active" | "archived"
      category: "all" | "sacks" | "twines"
      stock: "all" | "in_stock" | "low_stock" | "out_of_stock"
    }>
  ) => void
  hasActiveFilters: boolean
  onClear: () => void
  inventoryVisibility: Record<string, boolean>
  onInventoryVisibilityChange: Dispatch<SetStateAction<Record<string, boolean>>>
  batchVisibility: Record<string, boolean>
  onBatchVisibilityChange: Dispatch<SetStateAction<Record<string, boolean>>>
}

// Search, status, category, stock, and column visibility controls for the inventory table.
export default function InventoryFilterBar({
  search,
  onSearchChange,
  status,
  category,
  stock,
  onFilterChange,
  hasActiveFilters,
  onClear,
  inventoryVisibility,
  onInventoryVisibilityChange,
  batchVisibility,
  onBatchVisibilityChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative max-w-xs grow">
        <MagnifyingGlassIcon
          weight="bold"
          className="absolute -translate-y-1/2 left-3 top-1/2 size-4 text-muted-foreground"
        />
        <Input
          placeholder="Search products..."
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

      <Select
        value={category}
        onValueChange={(v) =>
          onFilterChange({
            category: v as "all" | "sacks" | "twines",
          })
        }
      >
        <SelectTrigger className="w-23.25">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CATEGORY_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={stock}
        onValueChange={(v) =>
          onFilterChange({
            stock: v as "all" | "in_stock" | "low_stock" | "out_of_stock",
          })
        }
      >
        <SelectTrigger className="w-31.5">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STOCK_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary">
            <ColumnsIcon weight="fill" className="text-muted-foreground" />
            Columns
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="grid grid-cols-2 gap-4 min-w-100"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel>Inventory Table</DropdownMenuLabel>
            {INVENTORY_TABLE_COLUMNS.map((col) => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={inventoryVisibility[col.id] ?? true}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={(checked) =>
                  onInventoryVisibilityChange((prev) => ({
                    ...prev,
                    [col.id]: checked === undefined ? true : checked,
                  }))
                }
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
          {/* <DropdownMenuSeparator /> */}
          <DropdownMenuGroup>
            <DropdownMenuLabel>Batch Table</DropdownMenuLabel>
            {BATCH_TABLE_COLUMNS.map((col) => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={batchVisibility[col.id] ?? true}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={(checked) =>
                  onBatchVisibilityChange((prev) => ({
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
          <XIcon weight="bold" />
          Clear
        </Button>
      ) : null}
    </div>
  )
}
