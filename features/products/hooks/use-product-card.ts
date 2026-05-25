"use client"

import { useRef, useState } from "react"
import { useDispatchQueueContext } from "@/features/dispatches/hooks/dispatch-queue-context"
import type { DispatchReadyProduct } from "@/features/products/validation"

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
  const [isEditing, setIsEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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
    setIsEditing(false)
  }

  const displayValue = isEditing ? inputValue : String(quantity)

  const isLowStock =
    product.lowStockThreshold > 0 &&
    product.currentQuantity < product.lowStockThreshold

  const isOutOfStock = product.currentQuantity === 0
  const isAtMax =
    quantity >= product.currentQuantity && product.currentQuantity > 0

  return {
    quantity,
    dispatchUom,
    inputValue: displayValue,
    setInputValue,
    inputRef,
    commitInput,
    setIsEditing,
    isLowStock,
    isOutOfStock,
    isAtMax,
    incrementQuantity: () => incrementQuantity(product),
    decrementQuantity: () => decrementQuantity(product._id),
    setDispatchUom: (uom: "roll" | "kilo") => setDispatchUom(product._id, uom),
  }
}
