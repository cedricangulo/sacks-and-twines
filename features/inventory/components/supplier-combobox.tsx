"use client"

import { Check, ChevronsUpDown } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface SupplierComboboxProps {
  suppliers: Array<{ id: string; name: string }>
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export default function SupplierCombobox({
  suppliers,
  value,
  onChange,
  disabled,
}: SupplierComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = useMemo(
    () => suppliers.find((s) => s.id === value),
    [suppliers, value]
  )

  const filtered = useMemo(
    () =>
      suppliers.filter((s) =>
        s.name.toLowerCase().includes(query.toLowerCase())
      ),
    [suppliers, query]
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
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        <span className="truncate">{selected?.name ?? "Select supplier"}</span>
        <ChevronsUpDown className="opacity-50 size-4 shrink-0" />
      </Button>

      {open && !disabled ? (
        <div className="absolute z-50 w-full mt-1 border shadow-lg rounded-2xl bg-popover">
          <div className="p-2">
            <Input
              placeholder="Search suppliers..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-48">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-center text-destructive-foreground">
                No suppliers found.
              </div>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                    s.id === value && "bg-accent"
                  )}
                  onClick={() => {
                    onChange(s.id)
                    setOpen(false)
                    setQuery("")
                  }}
                >
                  <Check
                    className={cn(
                      "size-4",
                      s.id === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {s.name}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
