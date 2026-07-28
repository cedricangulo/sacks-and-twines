"use client"

import { LockIcon, PencilIcon, SpinnerGapIcon } from "@phosphor-icons/react"
import type { ReactElement, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import UploadDropzone from "@/components/ui/upload-dropzone"
import type { Id } from "@/convex/_generated/dataModel"
import { useEditProductForm } from "../../hooks/use-edit-product-form"

// Dialog form for editing a product's name, category, UoM, conversion factor, low-stock threshold, and image.
export default function EditProductDialog({
  productId,
  children,
  open,
  onOpenChange,
}: {
  productId: Id<"products">
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
  } = useEditProductForm({ productId, open, onOpenChange })

  return (
    <Dialog open={dialogOpen} onOpenChange={setOpen}>
      {children ? (
        <DialogTrigger render={() => children as ReactElement} />
      ) : null}
      <DialogContent scrollable>
        <DialogHeader>
          <DialogTitle>Edit product</DialogTitle>
          <DialogDescription>
            {detail?.name ?? "Loading&hellip;"}
          </DialogDescription>
        </DialogHeader>

        {!detail || !formValues ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <SpinnerGapIcon
              weight="fill"
              size={20}
              className="mr-2 animate-spin"
            />
            Loading product details&hellip;
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <Field data-invalid={!!errors.name}>
              <Field>
                <FieldLabel>Item Image</FieldLabel>
                <FieldContent>
                  <UploadDropzone
                    className="w-full"
                    preview={imagePreview}
                    error={imageError}
                    onSelect={handleImageSelect}
                  />
                </FieldContent>
              </Field>

              <FieldLabel htmlFor="edit-product-name">Item Name</FieldLabel>
              <FieldContent>
                <Input
                  id="edit-product-name"
                  name="name"
                  value={formValues.name}
                  aria-invalid={!!errors.name}
                  onInput={(e) => handleChange("name", e.currentTarget.value)}
                />
              </FieldContent>
              {errors.name ? <FieldError>{errors.name}</FieldError> : null}
            </Field>

            <FieldGroup className="grid grid-cols-2">
              <Field data-invalid={!!errors.category}>
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel
                    htmlFor="edit-category"
                    className={
                      lockedFields.category
                        ? "text-muted-foreground"
                        : undefined
                    }
                  >
                    Category
                  </FieldLabel>
                </div>
                <FieldContent>
                  <Select
                    value={formValues.category}
                    onValueChange={(v) =>
                      handleChange("category", v as "sacks" | "twines")
                    }
                    disabled={lockedFields.category}
                  >
                    <SelectTrigger
                      id="edit-category"
                      className="w-full"
                      aria-invalid={!!errors.category}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="sacks">Sacks</SelectItem>
                        <SelectItem value="twines">Twines</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </FieldContent>
                {errors.category ? (
                  <FieldError>{errors.category}</FieldError>
                ) : null}
              </Field>

              <Field data-invalid={!!errors.baseUom}>
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel
                    htmlFor="edit-baseUom"
                    className={
                      lockedFields.baseUom ? "text-muted-foreground" : undefined
                    }
                  >
                    Unit / Measurement
                  </FieldLabel>
                </div>
                <FieldContent>
                  <Select
                    value={formValues.baseUom}
                    onValueChange={(v) =>
                      handleChange("baseUom", v as "piece" | "roll")
                    }
                    disabled={lockedFields.baseUom}
                  >
                    <SelectTrigger
                      id="edit-baseUom"
                      className="w-full"
                      aria-invalid={!!errors.baseUom}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="piece">Piece</SelectItem>
                        <SelectItem value="roll">Roll</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </FieldContent>
                {errors.baseUom ? (
                  <FieldError>{errors.baseUom}</FieldError>
                ) : null}
              </Field>
            </FieldGroup>

            {hasBatches ? (
              <div className="flex items-start gap-2 px-4 py-3 type-body-small border rounded-2xl border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/30 dark:bg-amber-950/20 dark:text-amber-300">
                <LockIcon weight="fill" size={16} className="mt-0.5 shrink-0" />
                <p>
                  Category and unit are locked because this product already has
                  stock records.
                </p>
              </div>
            ) : null}

            <FieldGroup className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!errors.conversionFactor}>
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel
                    htmlFor="edit-conversionFactor"
                    className={
                      lockedFields.conversionFactor
                        ? "text-muted-foreground"
                        : undefined
                    }
                  >
                    Conversion Factor
                  </FieldLabel>
                  {lockedFields.conversionFactor ? (
                    <Button
                      size="xs"
                      variant="ghost"
                      type="button"
                      onClick={() => handleUnlock("conversionFactor")}
                    >
                      <PencilIcon weight="fill" />
                      Edit
                    </Button>
                  ) : null}
                </div>
                <FieldContent>
                  <Input
                    id="edit-conversionFactor"
                    value={formValues.conversionFactor ?? ""}
                    disabled={lockedFields.conversionFactor}
                    type="number"
                    step="0.1"
                    min="0"
                    aria-invalid={!!errors.conversionFactor}
                    onInput={(e) =>
                      handleChange(
                        "conversionFactor",
                        e.currentTarget.value
                          ? Number(e.currentTarget.value)
                          : undefined
                      )
                    }
                  />
                </FieldContent>
                {errors.conversionFactor ? (
                  <FieldError>{errors.conversionFactor}</FieldError>
                ) : null}
              </Field>

              <Field data-invalid={!!errors.lowStockThreshold}>
                <FieldLabel htmlFor="edit-lowStockThreshold">
                  Low Stock Threshold
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="edit-lowStockThreshold"
                    value={formValues.lowStockThreshold ?? ""}
                    type="number"
                    step="1"
                    min="0"
                    aria-invalid={!!errors.lowStockThreshold}
                    onInput={(e) =>
                      handleChange(
                        "lowStockThreshold",
                        e.currentTarget.value
                          ? Number(e.currentTarget.value)
                          : undefined
                      )
                    }
                  />
                </FieldContent>
                {errors.lowStockThreshold ? (
                  <FieldError>{errors.lowStockThreshold}</FieldError>
                ) : null}
              </Field>
            </FieldGroup>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!dirty}>
                Save changes
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
