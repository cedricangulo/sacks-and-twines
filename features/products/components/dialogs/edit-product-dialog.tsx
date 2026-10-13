"use client"

import { SpinnerGapIcon, WarningIcon } from "@phosphor-icons/react"
import { type ReactElement, type ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { Product } from "@/features/inventory/validation"
import { useEditProductForm } from "../../hooks/use-edit-product-form"
import { EditProductForm } from "./edit-product-form"

// Dialog shell for editing a product. Owns the dialog state and the
// deleted/loading/form switch; the form body lives in `edit-product-form.tsx`
// so neither file carries the whole dialog's branches.
export default function EditProductDialog({
  product,
  children,
  open,
  onOpenChange,
}: {
  product: Product
  children?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const {
    detail,
    open: dialogOpen,
    setOpen,
    formValues,
    errors,
    imageError,
    dirty,
    lockedFields,
    hasBatches,
    imagePreview,
    handleChange,
    handleUnlock,
    handleSubmit,
    handleImageSelect,
  } = useEditProductForm({ product, open, onOpenChange })

  // Same precedence the hook uses to decide `hasBatches`: the row seeds the
  // first paint, `getEditDetail` refreshes it. Pre-backfill products have
  // `batchCount === undefined`, which the hook reads as "no batches", so this
  // only ever renders a non-zero count.
  const batchCount = detail?.batchCount ?? product.batchCount ?? 0

  return (
    <Dialog open={dialogOpen} onOpenChange={setOpen}>
      {children ? (
        <DialogTrigger render={() => children as ReactElement} />
      ) : null}

      {/* Header and footer are pinned; only the form body scrolls, so
          Cancel/Save stay reachable. `scrollable` is deliberately not used,
          because it would scroll the whole popup. */}
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0 sm:max-w-lg!">
        <DialogHeader className="shrink-0 p-6 pb-4">
          <DialogTitle>Edit product</DialogTitle>
          <DialogDescription>
            {detail ? (
              <>
                <span className="font-mono">{detail.skuCode}</span> ·{" "}
                {detail.name}
              </>
            ) : (
              (formValues?.name ?? "Loading…")
            )}
          </DialogDescription>
        </DialogHeader>

        <div aria-hidden className="h-px shrink-0 bg-border" />

        {detail === null ? (
          <div className="flex flex-1 items-center justify-center gap-2 p-6 text-muted-foreground">
            <WarningIcon weight="fill" size={20} />
            This product no longer exists.
          </div>
        ) : !formValues ? (
          // Defensive only: `useEditProductForm` seeds `formValues` from the row
          // it was opened from, so this is reachable only if that row ever fails
          // to provide the required fields.
          <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
            <SpinnerGapIcon
              weight="fill"
              size={20}
              className="mr-2 animate-spin"
            />
            Loading product details…
          </div>
        ) : (
          <EditProductForm
            formValues={formValues}
            errors={errors}
            lockedFields={lockedFields}
            hasBatches={hasBatches}
            batchCount={batchCount}
            imagePreview={imagePreview}
            imageError={imageError}
            dirty={dirty}
            handleChange={handleChange}
            handleUnlock={handleUnlock}
            handleSubmit={handleSubmit}
            handleImageSelect={handleImageSelect}
            setOpen={setOpen}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
