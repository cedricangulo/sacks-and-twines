"use client"

import { useMutation } from "convex/react"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { handleConvexError } from "@/lib/error-handler"
import type { StockAdjustmentFormData } from "../validation"

// Calls the Convex stock-adjustment mutation with sileo toast feedback.
export function useCreateStockAdjustment() {
  const createAdjustment = useMutation(api.stock_adjustments.mutations.create)

  const submit = async (
    batchId: Id<"batches">,
    productId: Id<"products">,
    data: StockAdjustmentFormData
  ) => {
    await sileo
      .promise(
        createAdjustment({
          batchId,
          productId,
          ...data,
          userAgent: navigator.userAgent,
        }),
        {
          loading: { title: "Adjusting stock..." },
          success: {
            title: "Stock adjusted",
            description: "Inventory has been updated.",
          },
          error: (err) => handleConvexError(err, "Failed to adjust stock"),
        }
      )
      .catch(() => {})
  }

  return { submit }
}
