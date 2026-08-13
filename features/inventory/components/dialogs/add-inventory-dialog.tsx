"use client"

import { InfoIcon } from "@phosphor-icons/react"
import { Tag, TagInput } from "emblor"
import dynamic from "next/dynamic"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

// Dialog for adding inventory — select an existing product or create a new one inline with batch and supplier details.
export default function AddInventoryDialog() {
  const {
    products,
    open,
    mode,
    selectedProductId,
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

      <DialogContent scrollable className="sm:max-w-5xl!">
        <DialogHeader>
          <DialogTitle>Add Inventory</DialogTitle>
          <DialogDescription>
            Select an existing item for fast stock entry or create a new item
            inline.
          </DialogDescription>
        </DialogHeader>

        <form
          id="inventory-form"
          onSubmit={(event) =>
            handleSubmit(
              event,
              keywordTags.map((tag) => tag.text)
            )
          }
          noValidate
          className="flex flex-col gap-6"
        >
          <FieldGroup className="grid grid-cols-1 md:grid-cols-2">
            {/* Left column: product selection */}
            <div className="flex flex-col gap-4">
              {mode === "existing" ? (
                <Field>
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
                <div className="flex flex-col gap-4">
                  <div
                    className="flex items-center justify-between gap-2 px-4 py-3 type-body-small border rounded-2xl border-primary/20 bg-accent text-accent-foreground"
                    role="alert"
                  >
                    <div className="flex items-center gap-2">
                      <InfoIcon weight="fill" size={16} className="shrink-0" />
                      <span>Creating a new item</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSwitchToExisting}
                    >
                      Cancel
                    </Button>
                  </div>

                  <Field data-invalid={!!errors.name}>
                    <FieldLabel htmlFor="name">Item Name</FieldLabel>
                    <FieldContent>
                      <Input
                        id="name"
                        name="name"
                        key={String(open)}
                        placeholder="Enter a new item name"
                        aria-invalid={!!errors.name}
                        onInput={() => clearFieldError("name")}
                      />
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="keywords">Search Keywords</FieldLabel>
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
                </div>
              )}

              <Field>
                <FieldLabel>Item Image</FieldLabel>
                <FieldContent>
                  <UploadDropzone
                    className="w-full"
                    preview={imageState.preview}
                    error={imageState.error}
                    onSelect={handleSelectImage}
                  />
                </FieldContent>
              </Field>
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

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save stock</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
