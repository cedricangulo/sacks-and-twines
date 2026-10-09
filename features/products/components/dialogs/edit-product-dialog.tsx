"use client"

import {
  LockIcon,
  PencilIcon,
  SpinnerGapIcon,
  WarningIcon,
} from "@phosphor-icons/react"
import { Tag, TagInput } from "emblor"
import { type ReactElement, type ReactNode, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import type { Product } from "@/features/inventory/validation"
import { useEditProductForm } from "../../hooks/use-edit-product-form"

// Dialog form for editing a product's name, category, UoM, conversion factor, low-stock threshold, and image.
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

  const [keywordTags, setKeywordTags] = useState<Tag[]>([])
  const [activeTagIndex, setActiveTagIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!dirty) {
      setKeywordTags(
        (formValues?.keywords ?? []).map((text, index) => ({
          id: String(index),
          text,
        }))
      )
    }
  }, [formValues, dirty])

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
          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6 [scrollbar-width:thin]">
              {/* Identity: image and name are siblings. Nesting the dropzone
                  inside the name field made `data-invalid` paint the image too. */}
              <div className="flex items-start gap-4">
                <UploadDropzone
                  preview={imagePreview}
                  error={imageError}
                  onSelect={handleImageSelect}
                />

                <Field className="min-w-0 flex-1" data-invalid={!!errors.name}>
                  <FieldLabel htmlFor="edit-product-name">Item Name</FieldLabel>
                  <FieldContent>
                    <Input
                      id="edit-product-name"
                      name="name"
                      value={formValues.name}
                      aria-invalid={!!errors.name}
                      onInput={(e) =>
                        handleChange("name", e.currentTarget.value)
                      }
                    />
                  </FieldContent>
                  {errors.name ? <FieldError>{errors.name}</FieldError> : null}
                </Field>
              </div>

              <Field>
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel htmlFor="edit-keywords">
                    Search Keywords
                  </FieldLabel>
                  <span className="type-caption text-muted-foreground">
                    Optional
                  </span>
                </div>
                <FieldContent>
                  <TagInput
                    id="edit-keywords"
                    activeTagIndex={activeTagIndex}
                    setActiveTagIndex={setActiveTagIndex}
                    tags={keywordTags}
                    setTags={(newTags) => {
                      const tags = Array.isArray(newTags)
                        ? newTags
                        : keywordTags
                      setKeywordTags(tags)
                      handleChange(
                        "keywords",
                        tags.map((tag) => tag.text)
                      )
                    }}
                    placeholder="Add a search keyword"
                    styleClasses={{
                      inlineTagsContainer:
                        "rounded-3xl bg-input/50 transition-[color,box-shadow] focus-within:border-ring outline-none focus-within:ring-[3px] focus-within:ring-ring/50 p-1 gap-1",
                      input:
                        "w-full min-w-[80px] rounded-xl shadow-none px-2 h-7",
                      tag: {
                        body: "h-7 relative bg-background/50 hover:bg-background rounded-xl font-medium type-body-small ps-2 pe-7",
                        closeButton:
                          "absolute -inset-y-px -end-px p-0 rounded-e-md flex size-7 transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] text-muted-foreground/80 hover:text-foreground",
                      },
                    }}
                  />
                </FieldContent>
                <p className="type-body-small text-muted-foreground">
                  Optional aliases used to find this item in product search.
                </p>
              </Field>

              {/* Sits above the fields it explains, and names the group rather
                  than enumerating two of its three members. Category and unit
                  are hard-blocked server-side; units-per-product is not, and
                  keeps its unlock affordance below. */}
              {hasBatches ? (
                <p className="flex items-center gap-1.5 type-caption text-muted-foreground">
                  <LockIcon weight="fill" className="size-3 shrink-0" />
                  Classification locked by {batchCount} stock record
                  {batchCount === 1 ? "" : "s"}
                </p>
              ) : null}

              <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field data-invalid={!!errors.category}>
                  <FieldLabel
                    htmlFor="edit-category"
                    className={
                      lockedFields.category
                        ? "flex items-center gap-1.5 text-muted-foreground"
                        : undefined
                    }
                  >
                    Category
                    {lockedFields.category ? (
                      <LockIcon weight="fill" className="size-3 shrink-0" />
                    ) : null}
                  </FieldLabel>
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
                  <FieldLabel
                    htmlFor="edit-baseUom"
                    className={
                      lockedFields.baseUom
                        ? "flex items-center gap-1.5 text-muted-foreground"
                        : undefined
                    }
                  >
                    Unit / Measurement
                    {lockedFields.baseUom ? (
                      <LockIcon weight="fill" className="size-3 shrink-0" />
                    ) : null}
                  </FieldLabel>
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

              <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                      Units Per Product
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
                      step="1"
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
            </div>

            <DialogFooter className="shrink-0 gap-2 border-t p-4 px-6">
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
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
