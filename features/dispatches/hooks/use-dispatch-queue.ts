"use client"

import { useCallback, useState } from "react"
import type { DispatchReadyProduct } from "@/features/products/validation"

export interface QueueItem {
  productId: string
  name: string
  skuCode: string
  category: "sacks" | "twines"
  baseUom: "piece" | "roll"
  imageUrl?: string
  quantity: number
  dispatchUom: "piece" | "roll" | "kilo"
}

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
          product.category === "sacks" ? Math.round(quantity) : quantity
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

  const setDispatchUom = useCallback(
    (productId: string, uom: "roll" | "kilo") => {
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
