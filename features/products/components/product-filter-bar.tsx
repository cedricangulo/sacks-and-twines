import { SearchIcon, XIcon } from "lucide-react"
import type { parseAsStringEnum } from "nuqs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const CATEGORY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "sacks", label: "Sacks" },
  { value: "twines", label: "Twines" },
] as const

const STOCK_OPTIONS = [
  { value: "all", label: "All" },
  { value: "in_stock", label: "In Stock" },
  { value: "low_stock", label: "Low Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
] as const

const SORT_OPTIONS = [
  { value: "name_asc", label: "Name A-Z" },
  { value: "name_desc", label: "Name Z-A" },
  { value: "stock_desc", label: "Stock High-Low" },
  { value: "stock_asc", label: "Stock Low-High" },
] as const

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
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative max-w-xs grow">
        <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
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

      <Select
        value={sort}
        onValueChange={(v) =>
          onFilterChange({
            sort: v as "name_asc" | "name_desc" | "stock_desc" | "stock_asc",
          })
        }
      >
        <SelectTrigger className="w-37">
          <SelectValue />
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
          <XIcon />
          Clear
        </Button>
      ) : null}
    </div>
  )
}
