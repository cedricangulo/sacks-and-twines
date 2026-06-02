"use client"

import { useEffect, useRef, useState } from "react"
import { useDispatchQueueContext } from "@/features/dispatches/hooks/dispatch-queue-context"
import type { DispatchReadyProduct } from "@/features/products/validation"

// Manages a single product card's quantity input, dispatch UoM toggle, and stock-status indicators.
export function useProductCard(product: DispatchReadyProduct) {
  const {
    items,
    incrementQuantity,
    decrementQuantity,
    setQuantity,
    setDispatchUom,
  } = useDispatchQueueContext()

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
    if (product.category !== "twines") {
      val = Math.round(val)
    }
    const clamped = Math.min(val, product.currentQuantity)
    setQuantity(product, clamped)
    setInputValue(String(clamped))
  }

  const isLowStock =
    product.lowStockThreshold > 0 &&
    product.currentQuantity < product.lowStockThreshold

  const isOutOfStock = product.currentQuantity === 0
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
    setDispatchUom: (uom: "roll" | "kilo") => setDispatchUom(product._id, uom),
  }
}
