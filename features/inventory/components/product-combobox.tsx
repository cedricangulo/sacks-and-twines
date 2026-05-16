"use client"

import { ChevronsUpDown, Plus } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Product } from "../validation"

interface ProductComboboxProps {
  products: Product[]
  value: string | null
  onChange: (productId: string | null) => void
  onAddNew: () => void
}

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
        className="justify-between w-full"
        onClick={() => setOpen(!open)}
      >
        <span className="truncate">
          {selected?.name ?? "Select an item or add a new one"}
        </span>
        <ChevronsUpDown className="opacity-50 size-4 shrink-0" />
      </Button>

      {open ? (
        <div className="absolute z-50 w-full mt-1 border shadow-lg rounded-2xl bg-popover">
          <div className="p-2">
            <Input
              placeholder="Search existing items..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="overflow-auto max-h-48">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-center text-destructive-foreground">
                No items found.
              </div>
            ) : (
              filtered.map((product) => (
                <button
                  key={product._id}
                  type="button"
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                    product._id === value && "bg-accent"
                  )}
                  onClick={() => {
                    onChange(product._id)
                    setOpen(false)
                    setQuery("")
                  }}
                >
                  <span className="font-medium">{product.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {product.skuCode}
                    {" — "}
                    <Badge
                      variant="secondary"
                      className="inline text-[10px] px-1 py-0"
                    >
                      {product.category}
                    </Badge>
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="p-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              className="w-full gap-2"
              onClick={() => {
                onAddNew()
                setOpen(false)
                setQuery("")
              }}
            >
              <Plus className="size-4" />
              Add New Item
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
