"use client"

import { useQuery } from "convex-helpers/react/cache"
import type { SubmitEvent } from "react"
import { useCallback, useMemo, useState } from "react"
import { api } from "@/convex/_generated/api"
import { DEFAULT_CONVERSION_FACTOR } from "@/convex/lib/constants"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"
import { useImageUpload } from "@/lib/hooks/use-image-upload"
import { type StockInFieldErrors, validateStockIn } from "../validation"
import { useCreateStockIn } from "./use-create-stock-in"

// Generates a draft SKU or batch code with date and random suffix.
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

// Fields that become "locked" (pre-filled) when selecting an existing product.
const LOCKED_FIELDS = [
  "category",
  "baseUom",
  "conversionFactor",
  "supplierId",
  "lowStockThreshold",
] as const

// All locked fields start locked when a product is selected.
const INITIAL_LOCKED_STATE = Object.fromEntries(
  LOCKED_FIELDS.map((f) => [f, true])
)

// Current values for all product/field inputs in the inventory dialog.
interface FieldValues {
  category: string
  baseUom: string
  conversionFactor: string
  supplierId: string
  lowStockThreshold: string
}

// Default empty field values when creating a new product.
const EMPTY_FIELDS: FieldValues = {
  category: "",
  baseUom: "",
  conversionFactor: "",
  supplierId: "",
  lowStockThreshold: "",
}

// Manages the add-inventory dialog state: existing/new product selection, field locking, draft codes, validation, and submission.
export function useInventoryDialog() {
  const { isAuthenticated } = useCurrentUser()

  const [open, setOpen] = useState(false)

  const products = useQuery(
    api.products.queries.listActive,
    open && isAuthenticated ? {} : "skip"
  )

  const rawSupplierOptions = useQuery(
    api.suppliers.queries.listActiveOptions,
    open && isAuthenticated ? {} : "skip"
  )

  const supplierOptions = useMemo(
    () =>
      rawSupplierOptions?.map((s) => ({ id: s._id, name: s.companyName })) ??
      null,
    [rawSupplierOptions]
  )

  const create = useCreateStockIn()
  const image = useImageUpload()

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

  const refreshDraftCodes = useCallback(() => {
    setDraftSku(generateDraftCode("SKU"))
    setDraftBatch(generateDraftCode("BAT"))
  }, [])

  const resetControlledFields = useCallback(() => {
    setFields(EMPTY_FIELDS)
  }, [])

  const handleOpen = useCallback(
    (newOpen: boolean) => {
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
    },
    [image, resetControlledFields, refreshDraftCodes]
  )

  const handleSelectProduct = useCallback(
    (productId: string | null) => {
      setSelectedProductId(productId)
      setLocked(INITIAL_LOCKED_STATE)
      const product = products?.find((p) => p._id === productId)
      if (product) {
        setFields({
          category: product.category,
          baseUom: product.baseUom,
          conversionFactor: String(product.conversionFactor ?? ""),
          supplierId: product.lastSupplierId ?? "",
          lowStockThreshold: String(product.lowStockThreshold ?? ""),
        })
      }
      refreshDraftCodes()
    },
    [products, refreshDraftCodes]
  )

  const handleAddNew = useCallback(() => {
    setMode("new")
    setSelectedProductId(null)
    setLocked(Object.fromEntries(LOCKED_FIELDS.map((f) => [f, false])))
    resetControlledFields()
    refreshDraftCodes()
  }, [resetControlledFields, refreshDraftCodes])

  const handleSwitchToExisting = useCallback(() => {
    setMode("existing")
    setLocked(INITIAL_LOCKED_STATE)
    if (selectedProduct) {
      setFields({
        category: selectedProduct.category,
        baseUom: selectedProduct.baseUom,
        conversionFactor: String(selectedProduct.conversionFactor ?? ""),
        supplierId: "",
        lowStockThreshold: String(selectedProduct.lowStockThreshold ?? ""),
      })
    } else {
      resetControlledFields()
    }
    refreshDraftCodes()
  }, [selectedProduct, resetControlledFields, refreshDraftCodes])

  const setField = useCallback((field: string, value: string) => {
    setFields((prev) => ({ ...prev, [field as keyof FieldValues]: value }))
  }, [])

  const handleCategoryChange = useCallback(
    (value: string | null) => {
      if (value == null) return
      setField("category", value)
      if (value === "sacks") {
        setFields((prev) => ({
          ...prev,
          baseUom: "piece",
          conversionFactor: String(DEFAULT_CONVERSION_FACTOR.sacks),
        }))
      }
      if (value === "twines") {
        setFields((prev) => ({
          ...prev,
          baseUom: "meter",
          conversionFactor: String(DEFAULT_CONVERSION_FACTOR.twines),
        }))
      }
      if (value === "thread") {
        setFields((prev) => ({
          ...prev,
          baseUom: "roll",
          conversionFactor: DEFAULT_CONVERSION_FACTOR.thread
            ? String(DEFAULT_CONVERSION_FACTOR.thread)
            : "",
        }))
      }
    },
    [setField]
  )

  const unlockField = useCallback((field: string) => {
    setLocked((prev) => ({ ...prev, [field]: false }))
  }, [])

  const clearFieldError = useCallback((field: keyof StockInFieldErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const handleSubmit = useCallback(
    async (event: SubmitEvent<HTMLFormElement>) => {
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
            ? (fields.category as "sacks" | "twines" | "thread") || undefined
            : undefined,
        baseUom:
          mode === "new" || (mode === "existing" && !locked.baseUom)
            ? (fields.baseUom as "piece" | "roll" | "meter") || undefined
            : undefined,
        conversionFactor:
          mode === "new" || (mode === "existing" && !locked.conversionFactor)
            ? fields.conversionFactor
              ? Number(fields.conversionFactor)
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
    },
    [image, mode, selectedProductId, locked, fields, create]
  )

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
