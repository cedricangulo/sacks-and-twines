"use client"

import { InfoIcon } from "lucide-react"
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
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useInventoryDialog } from "../../hooks/use-inventory-dialog"
import FieldCard from "../field-card"
import ProductCombobox from "../product-combobox"

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

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button>Add Inventory</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-5xl!">
        <DialogHeader>
          <DialogTitle>Add Inventory</DialogTitle>
          <DialogDescription>
            Select an existing item for fast stock entry or create a new item
            inline.
          </DialogDescription>
        </DialogHeader>

        <form
          id="inventory-form"
          key={String(open)}
          onSubmit={handleSubmit}
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
                    className="flex items-center justify-between gap-2 rounded-2xl border border-primary/20 bg-accent px-4 py-3 text-sm text-accent-foreground"
                    role="alert"
                  >
                    <div className="flex items-center gap-2">
                      <InfoIcon size={16} className="shrink-0" />
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
                        placeholder="Enter a new item name"
                        aria-invalid={!!errors.name}
                        onInput={() => clearFieldError("name")}
                      />
                    </FieldContent>
                  </Field>
                </div>
              )}
            </div>

            {/* Right column: field card */}
            <FieldCard
              mode={mode}
              draftSku={draftSku}
              draftBatch={draftBatch}
              fields={fields}
              locked={locked}
              errors={errors}
              supplierOptions={supplierOptions}
              onFieldChange={setField}
              onUnlock={unlockField}
              onCategoryChange={handleCategoryChange}
              clearFieldError={clearFieldError}
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
