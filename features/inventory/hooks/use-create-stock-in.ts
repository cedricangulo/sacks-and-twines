"use client"

import { useMutation } from "convex/react"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { handleConvexError } from "@/lib/error-handler"
import type { StockInFormData } from "../validation"

/** Return type from the stock-in mutation. */
type StockInResult = {
  productId: Id<"products">
  batchCode: string
}

/** Calls the Convex stock-in mutation with sileo toast feedback. */
export function useCreateStockIn() {
  const stockIn = useMutation(api.batches.mutations.stockIn)

  const submit = async (data: StockInFormData) => {
    return await sileo
      .promise(stockIn({ ...data, userAgent: navigator.userAgent }), {
        loading: { title: "Adding inventory..." },
        success: (result: StockInResult) => ({
          title: "Stock added",
          description: `Batch ${result.batchCode} recorded with ${data.quantityReceived} units.`,
        }),
        error: (err) => handleConvexError(err, "Failed to add inventory"),
      })
      .catch(() => {})
  }

  return { submit }
}
