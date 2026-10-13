"use client"

import { LockIcon, PencilIcon } from "@phosphor-icons/react"
import { TagInput } from "emblor"
import { type SubmitEvent, useState } from "react"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
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
import { PRODUCT_NAME_MAX } from "@/lib/form-primitives"
import { MAX_FACTOR, MAX_QUANTITY } from "@/lib/validation"
import type {
  ProductUpdateFieldErrors,
  ProductUpdateFormData,
} from "../../validation"

// Props for the edit-product form body. Mirrors the values the
// `useEditProductForm` hook exposes; the dialog shell owns the query state.
export interface EditProductFormProps {
  formValues: ProductUpdateFormData
  errors: ProductUpdateFieldErrors
  lockedFields: Record<string, boolean>
  hasBatches: boolean
  batchCount: number
  imagePreview: string | null
  imageError: string | null
  dirty: boolean
  handleChange: (
    field: keyof ProductUpdateFormData,
    value: string | number | string[] | undefined
  ) => void
  handleUnlock: (field: string) => void
  handleSubmit: (event: SubmitEvent<HTMLFormElement>) => void
  handleImageSelect: (file: File | null) => void
  setOpen: (open: boolean) => void
}

// Form body for the edit-product dialog: identity, keywords, classification,
// and numeric sections plus the footer. Split from the dialog shell so neither
// the shell nor any one section carries the whole form's branches.
export function EditProductForm({
  formValues,
  errors,
  lockedFields,
  hasBatches,
  batchCount,
  imagePreview,
  imageError,
  dirty,
  handleChange,
  handleUnlock,
  handleSubmit,
  handleImageSelect,
  setOpen,
}: EditProductFormProps) {
  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6 [scrollbar-width:thin]">
        <IdentitySection
          name={formValues.name}
          nameError={errors.name}
          imagePreview={imagePreview}
          imageError={imageError}
          handleChange={handleChange}
          handleImageSelect={handleImageSelect}
        />
        <KeywordsSection
          keywords={formValues.keywords ?? []}
          handleChange={handleChange}
        />
        <ClassificationSection
          category={formValues.category}
          baseUom={formValues.baseUom}
          categoryError={errors.category}
          baseUomError={errors.baseUom}
          lockedFields={lockedFields}
          hasBatches={hasBatches}
          batchCount={batchCount}
          handleChange={handleChange}
        />
        <NumericSection
          conversionFactor={formValues.conversionFactor}
          lowStockThreshold={formValues.lowStockThreshold}
          conversionFactorError={errors.conversionFactor}
          lowStockThresholdError={errors.lowStockThreshold}
          lockedFields={lockedFields}
          handleChange={handleChange}
          handleUnlock={handleUnlock}
        />
      </div>

      <DialogFooter className="shrink-0 gap-2 border-t p-4 px-6">
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={!dirty}>
          Save changes
        </Button>
      </DialogFooter>
    </form>
  )
}

// Image + name row. The dropzone sits beside the name field rather than nested
// inside it, so `data-invalid` never paints the image.
function IdentitySection({
  name,
  nameError,
  imagePreview,
  imageError,
  handleChange,
  handleImageSelect,
}: {
  name: string
  nameError?: string
  imagePreview: string | null
  imageError: string | null
  handleChange: EditProductFormProps["handleChange"]
  handleImageSelect: (file: File | null) => void
}) {
  return (
    <div className="flex items-start gap-4">
      <UploadDropzone
        preview={imagePreview}
        error={imageError}
        onSelect={handleImageSelect}
      />

      <Field className="min-w-0 flex-1" data-invalid={!!nameError}>
        <FieldLabel htmlFor="edit-product-name">Item Name</FieldLabel>
        <FieldContent>
          <Input
            id="edit-product-name"
            name="name"
            maxLength={PRODUCT_NAME_MAX}
            value={name}
            aria-invalid={!!nameError}
            onInput={(e) => handleChange("name", e.currentTarget.value)}
          />
        </FieldContent>
        {nameError ? <FieldError>{nameError}</FieldError> : null}
      </Field>
    </div>
  )
}

// Optional search-keyword tags, derived directly from the hydrated form
// values: every edit flows through `handleChange` into `formValues`, so there
// is no local copy to keep in sync and no resync effect.
function KeywordsSection({
  keywords,
  handleChange,
}: {
  keywords: string[]
  handleChange: EditProductFormProps["handleChange"]
}) {
  const [activeTagIndex, setActiveTagIndex] = useState<number | null>(null)
  const tags = keywords.map((text, index) => ({ id: String(index), text }))

  return (
    <Field>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor="edit-keywords">Search Keywords</FieldLabel>
        <span className="type-caption text-muted-foreground">Optional</span>
      </div>
      <FieldContent>
        <TagInput
          id="edit-keywords"
          activeTagIndex={activeTagIndex}
          setActiveTagIndex={setActiveTagIndex}
          tags={tags}
          setTags={(newTags) => {
            const resolved = Array.isArray(newTags) ? newTags : tags
            handleChange(
              "keywords",
              resolved.map((tag) => tag.text)
            )
          }}
          placeholder="Add a search keyword"
          styleClasses={{
            inlineTagsContainer:
              "rounded-3xl bg-input/50 transition-[color,box-shadow] focus-within:border-ring outline-none focus-within:ring-[3px] focus-within:ring-ring/50 p-1 gap-1",
            input: "w-full min-w-[80px] rounded-xl shadow-none px-2 h-7",
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
  )
}

// Category + unit selects with the batches lock note. Category and unit are
// hard-blocked server-side once batches exist; units-per-product keeps its
// unlock affordance in the numeric section below.
function ClassificationSection({
  category,
  baseUom,
  categoryError,
  baseUomError,
  lockedFields,
  hasBatches,
  batchCount,
  handleChange,
}: {
  category: ProductUpdateFormData["category"]
  baseUom: ProductUpdateFormData["baseUom"]
  categoryError?: string
  baseUomError?: string
  lockedFields: Record<string, boolean>
  hasBatches: boolean
  batchCount: number
  handleChange: EditProductFormProps["handleChange"]
}) {
  return (
    <>
      {hasBatches ? (
        <p className="flex items-center gap-1.5 type-caption text-muted-foreground">
          <LockIcon weight="fill" className="size-3 shrink-0" />
          Classification locked by {batchCount} stock record
          {batchCount === 1 ? "" : "s"}
        </p>
      ) : null}

      <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <LockedSelectField
          id="edit-category"
          label="Category"
          value={category}
          error={categoryError}
          locked={lockedFields.category}
          options={[
            { value: "sacks", label: "Sacks" },
            { value: "twines", label: "Twines" },
          ]}
          onChange={(v) => handleChange("category", v as "sacks" | "twines")}
        />
        <LockedSelectField
          id="edit-baseUom"
          label="Unit / Measurement"
          value={baseUom}
          error={baseUomError}
          locked={lockedFields.baseUom}
          options={[
            { value: "piece", label: "Piece" },
            { value: "roll", label: "Roll" },
          ]}
          onChange={(v) => handleChange("baseUom", v as "piece" | "roll")}
        />
      </FieldGroup>
    </>
  )
}

// One labelled select that shows a lock icon and disables itself when locked.
function LockedSelectField({
  id,
  label,
  value,
  error,
  locked,
  options,
  onChange,
}: {
  id: string
  label: string
  value: string
  error?: string
  locked?: boolean
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel
        htmlFor={id}
        className={
          locked ? "flex items-center gap-1.5 text-muted-foreground" : undefined
        }
      >
        {label}
        {locked ? <LockIcon weight="fill" className="size-3 shrink-0" /> : null}
      </FieldLabel>
      <FieldContent>
        <Select
          value={value}
          onValueChange={(v) => {
            if (v !== null) onChange(v)
          }}
          disabled={locked}
        >
          <SelectTrigger id={id} className="w-full" aria-invalid={!!error}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </FieldContent>
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  )
}

// Units-per-product (unlockable) + low-stock threshold inputs.
function NumericSection({
  conversionFactor,
  lowStockThreshold,
  conversionFactorError,
  lowStockThresholdError,
  lockedFields,
  handleChange,
  handleUnlock,
}: {
  conversionFactor?: number
  lowStockThreshold?: number
  conversionFactorError?: string
  lowStockThresholdError?: string
  lockedFields: Record<string, boolean>
  handleChange: EditProductFormProps["handleChange"]
  handleUnlock: (field: string) => void
}) {
  return (
    <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Field data-invalid={!!conversionFactorError}>
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
            value={conversionFactor ?? ""}
            disabled={lockedFields.conversionFactor}
            type="number"
            step="1"
            min="0"
            max={MAX_FACTOR}
            aria-invalid={!!conversionFactorError}
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
        {conversionFactorError ? (
          <FieldError>{conversionFactorError}</FieldError>
        ) : null}
      </Field>

      <Field data-invalid={!!lowStockThresholdError}>
        <FieldLabel htmlFor="edit-lowStockThreshold">
          Low Stock Threshold
        </FieldLabel>
        <FieldContent>
          <Input
            id="edit-lowStockThreshold"
            value={lowStockThreshold ?? ""}
            type="number"
            step="1"
            min="0"
            max={MAX_QUANTITY}
            aria-invalid={!!lowStockThresholdError}
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
        {lowStockThresholdError ? (
          <FieldError>{lowStockThresholdError}</FieldError>
        ) : null}
      </Field>
    </FieldGroup>
  )
}
