"use client"

import { ChevronsUpDown, Plus } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Product } from "../../inventory/validation"

/** Props for the product combobox component. */
interface ProductComboboxProps {
  products: Product[]
  value: string | null
  onChange: (productId: string | null) => void
  onAddNew: () => void
}

/** Searchable combobox for selecting a product or triggering "add new item". */
export default function ProductCombobox({
  products,
  value,
  onChange,
  onAddNew,
}: ProductComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = useMemo(
    () => products.find((p) => p._id === value),
    [products, value]
  )

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.skuCode.toLowerCase().includes(query.toLowerCase())
      ),
    [products, query]
  )

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={containerRef}>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        aria-controls="product-listbox"
        className="justify-between w-full"
        onClick={() => setOpen(!open)}
      >
        <span className="truncate">
          {selected?.name ?? "Select an item or add a new one"}
        </span>
        <ChevronsUpDown className="opacity-50" />
      </Button>

      {open ? (
        <div className="absolute z-50 w-full mt-1 border shadow-lg rounded-2xl bg-popover">
          <div className="p-2">
            <Input
              list="product-listbox"
              placeholder="Search existing items..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="overflow-y-auto max-h-68" id="product-listbox">
            {filtered.length === 0 ? (
              <p className="p-4 text-center type-sm text-destructive-foreground">
                No items found.
              </p>
            ) : (
              filtered.map((product) => (
                <button
                  key={product._id}
                  type="button"
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-accent transition-colors",
                    product._id === value && "bg-accent"
                  )}
                  onClick={() => {
                    onChange(product._id)
                    setOpen(false)
                    setQuery("")
                  }}
                >
                  <p className="flex items-center justify-between w-full gap-2 type-sm">
                    <span className="font-medium">{product.name}</span>
                    <Badge variant="secondary">{product.category}</Badge>
                  </p>
                  <span className="type-sm text-muted-foreground">
                    {product.skuCode}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="p-2 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                onAddNew()
                setOpen(false)
                setQuery("")
              }}
            >
              <Plus />
              Add New Item
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
