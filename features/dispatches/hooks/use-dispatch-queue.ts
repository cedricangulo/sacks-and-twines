"use client"

import { useCallback, useState } from "react"
import type { DispatchReadyProduct } from "@/features/products/validation"

// A product entry in the dispatch queue with quantity and UoM tracking.
export interface QueueItem {
  productId: string
  name: string
  skuCode: string
  category: "sacks" | "twines" | "thread"
  baseUom: "piece" | "roll" | "meter"
  imageUrl?: string
  quantity: number
  dispatchUom: "piece" | "roll" | "meter"
}

// Builds a QueueItem from a DispatchReadyProduct with the given quantity.
function createQueueItem(
  product: DispatchReadyProduct,
  quantity: number
): QueueItem {
  return {
    productId: product._id,
    name: product.name,
    skuCode: product.skuCode,
    category: product.category,
    baseUom: product.baseUom,
    imageUrl: product.imageUrl,
    quantity,
    dispatchUom: product.baseUom,
  }
}

// Manages the in-memory dispatch queue: add/remove items, adjust quantities, toggle dispatch UoM.
export function useDispatchQueue() {
  const [items, setItems] = useState<QueueItem[]>([])

  const incrementQuantity = useCallback((product: DispatchReadyProduct) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.productId === product._id)
      if (existing) {
        if (existing.quantity >= product.currentQuantity) return prev
        return prev.map((item) =>
          item.productId === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, createQueueItem(product, 1)]
    })
  }, [])

  const decrementQuantity = useCallback((productId: string) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.productId === productId)
      if (!existing) return prev
      if (existing.quantity <= 1) {
        return prev.filter((item) => item.productId !== productId)
      }
      return prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )
    })
  }, [])

  const setQuantity = useCallback(
    (product: DispatchReadyProduct, quantity: number) => {
      setItems((prev) => {
        const sanitized =
          product.baseUom === "meter" ? quantity : Math.round(quantity)
        const clamped = Math.max(
          0,
          Math.min(sanitized, product.currentQuantity)
        )
        const existing = prev.find((item) => item.productId === product._id)

        if (clamped === 0 && !existing) return prev
        if (clamped === 0) {
          return prev.filter((item) => item.productId !== product._id)
        }
        if (!existing) {
          return [...prev, createQueueItem(product, clamped)]
        }
        return prev.map((item) =>
          item.productId === product._id ? { ...item, quantity: clamped } : item
        )
      })
    },
    []
  )

  // ! Unused for now, but may be useful in the future if we allow users to change UoM in the dispatch queue.
  const setDispatchUom = useCallback(
    (productId: string, uom: "piece" | "roll" | "meter") => {
      setItems((prev) =>
        prev.map((item) =>
          item.productId === productId ? { ...item, dispatchUom: uom } : item
        )
      )
    },
    []
  )

  const removeFromQueue = useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId))
  }, [])

  const clearQueue = useCallback(() => {
    setItems([])
  }, [])

  const isInQueue = useCallback(
    (productId: string) => items.some((item) => item.productId === productId),
    [items]
  )

  return {
    items,
    itemCount: items.length,
    incrementQuantity,
    decrementQuantity,
    setQuantity,
    setDispatchUom,
    removeFromQueue,
    clearQueue,
    isInQueue,
  }
}
