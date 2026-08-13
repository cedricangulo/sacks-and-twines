import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CATEGORY_OPTIONS, SORT_OPTIONS, STOCK_OPTIONS } from "./../constants"

// Props for the product filter bar.
interface Props {
  search: string
  onSearchChange: (value: string) => void
  category: "all" | "sacks" | "twines"
  stock: "all" | "in_stock" | "low_stock" | "out_of_stock"
  sort: "name_asc" | "name_desc" | "stock_desc" | "stock_asc"
  onFilterChange: (
    filters: Partial<{
      category: "all" | "sacks" | "twines"
      stock: "all" | "in_stock" | "low_stock" | "out_of_stock"
      sort: "name_asc" | "name_desc" | "stock_desc" | "stock_asc"
    }>
  ) => void
  hasActiveFilters: boolean
  onClear: () => void
}

// Filters, sort, and search controls for the product catalog.
export default function ProductFilterBar({
  search,
  onSearchChange,
  category,
  stock,
  sort,
  onFilterChange,
  hasActiveFilters,
  onClear,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 sticky top-0 bg-background z-30 pb-2">
      <div className="relative max-w-xs grow">
        <MagnifyingGlassIcon
          weight="bold"
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select
        value={category}
        onValueChange={(v) =>
          onFilterChange({
            category: v as "all" | "sacks" | "twines",
          })
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

      <Select
        value={sort}
        onValueChange={(v) =>
          onFilterChange({
            sort: v as "name_asc" | "name_desc" | "stock_desc" | "stock_asc",
          })
        }
      >
        <SelectTrigger className="w-37">
          <SelectValue>
            {SORT_OPTIONS.find((o) => o.value === sort)?.label ?? sort}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters ? (
        <Button type="button" variant="ghost" onClick={onClear}>
          <XIcon weight="bold" />
          Clear
        </Button>
      ) : null}
    </div>
  )
}
