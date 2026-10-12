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
import {
  BATCH_TABLE_COLUMNS,
  CATEGORY_OPTIONS,
  INVENTORY_TABLE_COLUMNS,
  type ProductCategory,
  type ProductUom,
  STATUS_OPTIONS,
  STOCK_OPTIONS,
  UOM_OPTIONS,
} from "../constants"

// Props for the inventory filter bar.
interface Props {
  search: string
  onSearchChange: (value: string) => void
  status: "all" | "active" | "archived"
  category: ProductCategory
  uom: ProductUom
  stock: "all" | "in_stock" | "low_stock" | "out_of_stock"
  onFilterChange: (
    filters: Partial<{
      status: "all" | "active" | "archived"
      category: ProductCategory
      uom: ProductUom
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
  uom,
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

      <Select
        value={category}
        onValueChange={(v) =>
          onFilterChange({ category: v as ProductCategory })
        }
      >
        <SelectTrigger className="w-37">
          <SelectValue>
            {CATEGORY_OPTIONS.find((o) => o.value === category)?.label ??
              category}
          </SelectValue>
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
        value={uom}
        onValueChange={(v) => onFilterChange({ uom: v as ProductUom })}
      >
        <SelectTrigger className="w-33">
          <SelectValue>
            {UOM_OPTIONS.find((o) => o.value === uom)?.label ?? uom}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {UOM_OPTIONS.map((opt) => (
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
          <SelectValue>
            {STOCK_OPTIONS.find((o) => o.value === stock)?.label ?? stock}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {STOCK_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ColumnVisibilityMenu
        groups={[
          {
            label: "Inventory Table",
            columns: INVENTORY_TABLE_COLUMNS,
            visibility: inventoryVisibility,
            onVisibilityChange: onInventoryVisibilityChange,
          },
          {
            label: "Batch Table",
            columns: BATCH_TABLE_COLUMNS,
            visibility: batchVisibility,
            onVisibilityChange: onBatchVisibilityChange,
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
