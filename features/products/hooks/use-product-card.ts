"use client"

import { useEffect, useRef, useState } from "react"
import { useDispatchQueueContext } from "@/features/dispatches/hooks/dispatch-queue-context"
import type { DispatchReadyProduct } from "@/features/products/validation"
import { getStockLevel } from "@/lib/stock-level"

// Manages a single product card's quantity input and stock-status indicators.
export function useProductCard(product: DispatchReadyProduct) {
  const { items, incrementQuantity, decrementQuantity, setQuantity } =
    useDispatchQueueContext()

  const queueItem = items.find((i) => i.productId === product._id)
  const quantity = queueItem?.quantity ?? 0
  const dispatchUom = queueItem?.dispatchUom ?? product.baseUom

  const [inputValue, setInputValue] = useState(String(quantity))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setInputValue(String(quantity))
    }
  }, [quantity])

  const commitInput = (raw: string) => {
    const trimmed = raw.trim()
    if (trimmed === "") {
      setQuantity(product, 0)
      setInputValue("0")
      return
    }
    let val = parseFloat(trimmed)
    if (isNaN(val) || val < 0) {
      setInputValue(String(quantity))
      return
    }
    if (product.baseUom !== "meter") {
      val = Math.round(val)
    }
    const clamped = Math.min(val, product.currentQuantity)
    setQuantity(product, clamped)
    setInputValue(String(clamped))
  }

  // Shared with the stock banner, stat tiles, inventory badge and the
  // `/inventory?stock=low_stock` view, so a product at exactly its threshold is
  // classified identically everywhere rather than disagreeing with the view
  // this card links to.
  const isLowStock =
    getStockLevel(product.currentQuantity, product.lowStockThreshold) ===
    "low_stock"

  const isOutOfStock =
    getStockLevel(product.currentQuantity, product.lowStockThreshold) ===
    "out_of_stock"
  const isAtMax =
    quantity >= product.currentQuantity && product.currentQuantity > 0

  return {
    quantity,
    dispatchUom,
    inputValue,
    setInputValue,
    inputRef,
    commitInput,
    isLowStock,
    isOutOfStock,
    isAtMax,
    incrementQuantity: () => incrementQuantity(product),
    decrementQuantity: () => decrementQuantity(product._id),
  }
}
