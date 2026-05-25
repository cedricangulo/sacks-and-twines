"use client"

import type { SubmitEvent } from "react"
import { useMemo, useState } from "react"
import { useActiveProducts } from "@/features/products/hooks/use-products"
import { useSupplierOptions } from "@/features/suppliers/hooks/use-suppliers"
import { useImageUpload } from "@/lib/hooks/use-image-upload"
import { type StockInFieldErrors, validateStockIn } from "../validation"
import { useCreateStockIn } from "./use-create-stock-in"

function generateDraftCode(prefix: string) {
  const now = new Date()
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("")
  const randomPart = String(Math.floor(Math.random() * 9000) + 1000)
  return `${prefix}-${datePart}-${randomPart}`
}

type FieldLockState = Record<string, boolean>

const LOCKED_FIELDS = [
  "category",
  "baseUom",
  "weightPerUnit",
  "supplierId",
  "lowStockThreshold",
] as const

const INITIAL_LOCKED_STATE = Object.fromEntries(
  LOCKED_FIELDS.map((f) => [f, true])
)

interface FieldValues {
  category: string
  baseUom: string
  weightPerUnit: string
  supplierId: string
  lowStockThreshold: string
}

const EMPTY_FIELDS: FieldValues = {
  category: "",
  baseUom: "",
  weightPerUnit: "",
  supplierId: "",
  lowStockThreshold: "",
}

export function useInventoryDialog() {
  const products = useActiveProducts()
  const supplierOptions = useSupplierOptions()
  const create = useCreateStockIn()
  const image = useImageUpload()

  const [open, setOpen] = useState(false)
  const [errors, setErrors] = useState<StockInFieldErrors>({})
  const [mode, setMode] = useState<"existing" | "new">("existing")
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  )
  const [draftSku, setDraftSku] = useState("")
  const [draftBatch, setDraftBatch] = useState("")
  const [locked, setLocked] = useState<FieldLockState>(INITIAL_LOCKED_STATE)
  const [fields, setFields] = useState<FieldValues>(EMPTY_FIELDS)

  const selectedProduct = useMemo(
    () => products?.find((p) => p._id === selectedProductId) ?? null,
    [products, selectedProductId]
  )

  const refreshDraftCodes = () => {
    setDraftSku(generateDraftCode("SKU"))
    setDraftBatch(generateDraftCode("BAT"))
  }

  const resetControlledFields = () => {
    setFields(EMPTY_FIELDS)
  }

  const handleOpen = (newOpen: boolean) => {
    setOpen(newOpen)
    if (newOpen) {
      setErrors({})
      setMode("existing")
      setSelectedProductId(null)
      setLocked(INITIAL_LOCKED_STATE)
      resetControlledFields()
      refreshDraftCodes()
      image.reset()
    }
  }

  const handleSelectProduct = (productId: string | null) => {
    setSelectedProductId(productId)
    setLocked(INITIAL_LOCKED_STATE)
    const product = products?.find((p) => p._id === productId)
    if (product) {
      setFields({
        category: product.category,
        baseUom: product.baseUom,
        weightPerUnit: String(product.weightPerUnit ?? ""),
        supplierId: product.lastSupplierId ?? "",
        lowStockThreshold: String(product.lowStockThreshold ?? ""),
      })
    }
    refreshDraftCodes()
  }

  const handleAddNew = () => {
    setMode("new")
    setSelectedProductId(null)
    setLocked(Object.fromEntries(LOCKED_FIELDS.map((f) => [f, false])))
    resetControlledFields()
    refreshDraftCodes()
  }

  const handleSwitchToExisting = () => {
    setMode("existing")
    setLocked(INITIAL_LOCKED_STATE)
    if (selectedProduct) {
      setFields({
        category: selectedProduct.category,
        baseUom: selectedProduct.baseUom,
        weightPerUnit: String(selectedProduct.weightPerUnit ?? ""),
        supplierId: "",
        lowStockThreshold: String(selectedProduct.lowStockThreshold ?? ""),
      })
    } else {
      resetControlledFields()
    }
    refreshDraftCodes()
  }

  const setField = (field: string, value: string) => {
    setFields((prev) => ({ ...prev, [field as keyof FieldValues]: value }))
  }

  const handleCategoryChange = (value: string) => {
    setField("category", value)
    if (value === "sacks") {
      setFields((prev) => ({ ...prev, baseUom: "piece", weightPerUnit: "0" }))
    }
    if (value === "twines") {
      setFields((prev) => ({
        ...prev,
        baseUom: "roll",
        weightPerUnit: "20",
      }))
    }
  }

  const unlockField = (field: string) => {
    setLocked((prev) => ({ ...prev, [field]: false }))
  }

  const clearFieldError = (field: keyof StockInFieldErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})

    const form = event.currentTarget

    let imageStorageId: string | null = null
    if (image.state.file) {
      imageStorageId = await image.upload()
    }

    const formData = new FormData(form)

    const formName = String(formData.get("name") ?? "")

    const payload = {
      mode,
      productId: mode === "existing" ? selectedProductId : undefined,
      name: mode === "new" ? formName || undefined : undefined,
      category:
        mode === "new" || (mode === "existing" && !locked.category)
          ? (fields.category as "sacks" | "twines") || undefined
          : undefined,
      baseUom:
        mode === "new" || (mode === "existing" && !locked.baseUom)
          ? (fields.baseUom as "piece" | "roll") || undefined
          : undefined,
      weightPerUnit:
        mode === "new" || (mode === "existing" && !locked.weightPerUnit)
          ? fields.weightPerUnit
            ? Number(fields.weightPerUnit)
            : undefined
          : undefined,
      supplierId:
        mode === "new" || (mode === "existing" && !locked.supplierId)
          ? fields.supplierId
          : fields.supplierId || "",
      quantityReceived: Number(formData.get("quantityReceived") ?? 0),
      totalProcurementCost: Number(formData.get("totalProcurementCost") ?? 0),
      lowStockThreshold:
        mode === "new" || (mode === "existing" && !locked.lowStockThreshold)
          ? fields.lowStockThreshold
            ? Number(fields.lowStockThreshold)
            : undefined
          : undefined,
      imageStorageId: imageStorageId ?? undefined,
    }

    const result = validateStockIn(payload)

    if (!result.success) {
      setErrors(result.errors)
      return
    }

    setOpen(false)
    return await create.submit(result.data)
  }

  return {
    products,
    open,
    mode,
    selectedProductId,
    selectedProduct,
    errors,
    draftSku,
    draftBatch,
    locked,
    fields,
    supplierOptions,
    imageState: image.state,
    handleSelectImage: image.selectFile,
    handleOpen,
    handleSelectProduct,
    handleAddNew,
    handleSwitchToExisting,
    handleCategoryChange,
    setField,
    unlockField,
    clearFieldError,
    handleSubmit,
  }
}
