"use client"

import { InfoIcon, LockIcon } from "@phosphor-icons/react"
import { Tag, TagInput } from "emblor"
import dynamic from "next/dynamic"
import { useEffect, useMemo, useState } from "react"
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
import { DialogBackdrop } from "@/components/ui/dialog-backdrop"
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import UploadDropzone from "@/components/ui/upload-dropzone"
import { PRODUCT_NAME_MAX } from "@/lib/form-primitives"
import { useInventoryDialog } from "../../hooks/use-inventory-dialog"
import FieldCard from "../field-card"

const ProductCombobox = dynamic(
  () => import("@/features/products/components/product-combobox"),
  {
    loading: () => (
      <div className="h-10 w-full animate-pulse rounded-2xl bg-muted" />
    ),
  }
)

// Read-only tag chips mirroring the product's saved keywords. Stock-in never
// patches product keywords, because `batches.mutations.stockIn` only writes
// them on the new-product branch, so this is display-only and non-editable.
function LockedKeywordTags({ keywords }: { keywords: string[] | undefined }) {
  if (!keywords || keywords.length === 0) {
    return (
      <div className="flex min-h-9 items-center rounded-3xl border border-dashed bg-muted/30 px-3 py-1.5">
        <span className="type-body-small text-muted-foreground">
          No keywords yet. Add them in Edit product.
        </span>
      </div>
    )
  }

  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-3xl border border-dashed bg-muted/30 px-2 py-1.5">
      {keywords.map((keyword) => (
        <span
          key={keyword}
          className="h-7 rounded-md bg-background px-2 font-medium type-body-small text-foreground"
        >
          {keyword}
        </span>
      ))}
    </div>
  )
}

// Dialog for adding inventory. Select an existing product, or create a new one inline with batch and supplier details.
export default function AddInventoryDialog() {
  const {
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
    imageState,
    handleSelectImage,
    handleOpen,
    handleSelectProduct,
    handleAddNew,
    handleSwitchToExisting,
    handleCategoryChange,
    setField,
    unlockField,
    clearFieldError,
    handleSubmit,
  } = useInventoryDialog()

  const [keywordTags, setKeywordTags] = useState<Tag[]>([])
  const [activeTagIndex, setActiveTagIndex] = useState<number | null>(null)

  // Keyword tags are dialog-local state, so the hook's open reset never clears
  // them. Reset on every open so stale tags from a previous session aren't
  // submitted with a new product.
  useEffect(() => {
    if (open) {
      setKeywordTags([])
      setActiveTagIndex(null)
    }
  }, [open])

  const formState = useMemo(
    () => ({ fields, locked, errors, supplierOptions }),
    [fields, locked, errors, supplierOptions]
  )

  const formActions = useMemo(
    () => ({
      onFieldChange: setField,
      onUnlock: unlockField,
      onCategoryChange: handleCategoryChange,
      clearFieldError,
    }),
    [setField, unlockField, handleCategoryChange, clearFieldError]
  )

  return (
    <Dialog modal={false} open={open} onOpenChange={handleOpen}>
      <DialogTrigger render={<Button />}>Add Inventory</DialogTrigger>

      {open ? <DialogBackdrop /> : null}

      {/* Header and footer are pinned; only the field grid scrolls, so
          Cancel/Save stay reachable without scrolling. `scrollable` is
          deliberately not used, because it would scroll the whole popup. */}
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0 sm:max-w-4xl!">
        <DialogHeader className="shrink-0 p-6 pb-4">
          <DialogTitle>Add Inventory</DialogTitle>
          <DialogDescription>
            Select an existing item for fast stock entry or create a new item
            inline.
          </DialogDescription>
        </DialogHeader>

        <div aria-hidden className="h-px shrink-0 bg-border" />

        <form
          id="inventory-form"
          onSubmit={(event) =>
            handleSubmit(
              event,
              keywordTags.map((tag) => tag.text)
            )
          }
          noValidate
          className="flex min-h-0 flex-1 flex-col"
        >
          {/* Column headings, hidden below md where the grid collapses to a
              single column and the labels would misalign. */}
          <div className="hidden shrink-0 gap-6 px-6 pt-5 md:grid md:grid-cols-2">
            <p className="type-caption text-muted-foreground">Item</p>
            <p className="type-caption text-muted-foreground">Batch</p>
          </div>

          <FieldGroup className="grid min-h-0 flex-1 grid-cols-1 content-start gap-x-6 gap-y-5 overflow-y-auto px-6 py-5 [scrollbar-width:thin] md:grid-cols-2">
            {/* Left column: product selection */}
            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-4">
                <UploadDropzone
                  preview={imageState.preview}
                  error={imageState.error}
                  onSelect={handleSelectImage}
                />

                <div className="flex min-w-0 flex-1 flex-col gap-5">
                  {mode === "existing" ? (
                    <Field className="min-w-0 flex-1">
                      <FieldLabel>Product</FieldLabel>
                      <FieldContent>
                        <ProductCombobox
                          products={products ?? []}
                          value={selectedProductId}
                          onChange={handleSelectProduct}
                          onAddNew={handleAddNew}
                        />
                      </FieldContent>
                    </Field>
                  ) : (
                    <Field
                      className="min-w-0 flex-1"
                      data-invalid={!!errors.name}
                    >
                      <FieldLabel htmlFor="name">Item Name</FieldLabel>
                      <FieldContent>
                        <Input
                          id="name"
                          name="name"
                          key={String(open)}
                          maxLength={PRODUCT_NAME_MAX}
                          placeholder="Enter a new item name"
                          aria-invalid={!!errors.name}
                          onInput={() => clearFieldError("name")}
                        />
                      </FieldContent>
                    </Field>
                  )}
                </div>
              </div>

              {mode === "existing" ? (
                // Read-only: stock-in never writes product keywords, so an
                // editable field here would imply a change the server drops.
                <Field>
                  <div className="flex items-center gap-1.5">
                    <FieldLabel className="flex items-center gap-1.5">
                      Search Keywords
                      <LockIcon
                        weight="fill"
                        className="size-3 text-muted-foreground"
                      />
                    </FieldLabel>
                  </div>
                  <FieldContent>
                    <LockedKeywordTags keywords={selectedProduct?.keywords} />
                  </FieldContent>
                  <p className="type-body-small text-muted-foreground">
                    Aliases used to find this item in product search. Change
                    them in Edit product.
                  </p>
                </Field>
              ) : (
                <Field>
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel htmlFor="keywords">Search Keywords</FieldLabel>
                    <span className="type-caption text-muted-foreground">
                      Optional
                    </span>
                  </div>
                  <FieldContent>
                    <TagInput
                      id="keywords"
                      activeTagIndex={activeTagIndex}
                      setActiveTagIndex={setActiveTagIndex}
                      tags={keywordTags}
                      setTags={setKeywordTags}
                      placeholder="Add a search keyword"
                      styleClasses={{
                        inlineTagsContainer:
                          "border-input rounded-3xl bg-background transition-[color,box-shadow] focus-within:border-ring outline-none focus-within:ring-[3px] focus-within:ring-ring/50 p-1 gap-1",
                        input: "w-full min-w-[80px] shadow-none px-2 h-7",
                        tag: {
                          body: "h-7 relative bg-background border border-input hover:bg-background rounded-md font-medium text-xs ps-2 pe-7",
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
              )}

              {mode === "new" ? (
                // A mode state, not an error, so no role="alert". It sits
                // below the fields it explains rather than above them.
                <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-muted/40 px-4 py-3 type-body-small">
                  <div className="flex items-center gap-2">
                    <InfoIcon
                      weight="fill"
                      size={16}
                      className="shrink-0 text-muted-foreground"
                    />
                    <span>Creating a new item. Not saved yet.</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSwitchToExisting}
                  >
                    Switch to existing
                  </Button>
                </div>
              ) : null}
            </div>

            {/* Right column: field card */}
            <FieldCard
              mode={mode}
              draftSku={draftSku}
              draftBatch={draftBatch}
              formState={formState}
              formActions={formActions}
            />
          </FieldGroup>

          <DialogFooter className="shrink-0 gap-2 border-t p-4 px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save stock</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
