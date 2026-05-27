"use client"

import { PencilIcon } from "lucide-react"
import { memo } from "react"
import { Button } from "@/components/ui/button"
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
import { Separator } from "@/components/ui/separator"
import { Id } from "@/convex/_generated/dataModel"
import SupplierCombobox from "@/features/suppliers/components/supplier-combobox"
import type { StockInFieldErrors } from "../validation"

/** Form state passed into the field card. */
interface FieldCardState {
  fields: {
    category: string
    baseUom: string
    weightPerUnit: string
    supplierId: string
    lowStockThreshold: string
  }
  locked: Record<string, boolean>
  errors: StockInFieldErrors
  supplierOptions: { id: Id<"suppliers">; name: string }[] | null
}

/** Actions exposed to the field card for modifying form state. */
interface FieldCardActions {
  onFieldChange: (field: string, value: string) => void
  onUnlock: (field: string) => void
  onCategoryChange: (value: string) => void
  clearFieldError: (field: keyof StockInFieldErrors) => void
}

/** Props for the field card component. */
interface FieldCardProps {
  mode: "existing" | "new"
  draftSku: string
  draftBatch: string
  formState: FieldCardState
  formActions: FieldCardActions
}

/** Renders a labeled form field with optional lock/unlock toggle and error display. */
function RenderInput({
  field,
  label,
  mode,
  isLocked,
  hideLock,
  onUnlock,
  hasError,
  errorMessage,
  children,
}: {
  field: string
  label: string
  mode: "existing" | "new"
  isLocked: boolean
  hideLock?: boolean
  onUnlock: (field: string) => void
  hasError?: boolean
  errorMessage?: string
  children: React.ReactNode
}) {
  return (
    <Field data-invalid={!!hasError}>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel
          htmlFor={field}
          className={isLocked ? "text-muted-foreground" : undefined}
        >
          {label}
        </FieldLabel>
        {isLocked && !hideLock && mode === "existing" ? (
          <Button
            size="xs"
            variant="ghost"
            type="button"
            onClick={() => onUnlock(field)}
          >
            <PencilIcon className="size-3" />
            Edit
          </Button>
        ) : null}
      </div>
      <FieldContent>{children}</FieldContent>
      {errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
    </Field>
  )
}

/** Card containing product fields (category, UoM, weight, supplier, threshold) and batch entry fields. */
const FieldCard = memo(function FieldCard({
  mode,
  draftSku,
  draftBatch,
  formState: { fields, locked, errors, supplierOptions },
  formActions: { onFieldChange, onUnlock, onCategoryChange, clearFieldError },
}: FieldCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border p-4">
      <FieldGroup className="grid grid-cols-2">
        <Field>
          <FieldLabel>SKU</FieldLabel>
          <FieldContent>
            <Input value={draftSku} disabled className="font-mono text-sm" />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel>Batch ID</FieldLabel>
          <FieldContent>
            <Input value={draftBatch} disabled className="font-mono text-sm" />
          </FieldContent>
        </Field>
      </FieldGroup>

      <FieldGroup className="grid grid-cols-2">
        <RenderInput
          field="category"
          label="Category"
          mode={mode}
          isLocked={locked["category"] ?? false}
          onUnlock={onUnlock}
          hasError={!!errors.category}
        >
          <Select
            value={fields.category}
            onValueChange={onCategoryChange}
            disabled={locked["category"] ?? false}
          >
            <SelectTrigger className="w-full" aria-invalid={!!errors.category}>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="sacks">Sacks</SelectItem>
                <SelectItem value="twines">Twines</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </RenderInput>

        <RenderInput
          field="baseUom"
          label="Unit / Measurement"
          mode={mode}
          isLocked={locked["baseUom"] ?? false}
          onUnlock={onUnlock}
          hasError={!!errors.baseUom}
        >
          <Select
            value={fields.baseUom}
            onValueChange={(v) => {
              onFieldChange("baseUom", v)
              clearFieldError("baseUom")
            }}
            disabled={locked["baseUom"] ?? false}
          >
            <SelectTrigger className="w-full" aria-invalid={!!errors.baseUom}>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="piece">Piece</SelectItem>
                <SelectItem value="roll">Roll</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </RenderInput>
      </FieldGroup>

      <FieldGroup className="grid grid-cols-2">
        <RenderInput
          field="weightPerUnit"
          label="Weight per Unit (kg)"
          mode={mode}
          isLocked={locked["weightPerUnit"] ?? false}
          onUnlock={onUnlock}
          hasError={!!errors.weightPerUnit}
        >
          <Input
            value={fields.weightPerUnit}
            onInput={(e) => {
              onFieldChange("weightPerUnit", e.currentTarget.value)
              clearFieldError("weightPerUnit")
            }}
            type="number"
            step="0.0001"
            min="0"
            placeholder="Optional"
            disabled={locked["weightPerUnit"] ?? false}
            aria-invalid={!!errors.weightPerUnit}
          />
        </RenderInput>

        <RenderInput
          field="supplierId"
          label="Supplier"
          mode={mode}
          isLocked={locked["supplierId"] ?? false}
          hideLock={mode === "new"}
          onUnlock={onUnlock}
          hasError={!!errors.supplierId}
        >
          <SupplierCombobox
            suppliers={supplierOptions ?? []}
            value={fields.supplierId}
            onChange={(v) => {
              onFieldChange("supplierId", v)
              clearFieldError("supplierId")
            }}
            disabled={locked["supplierId"] ?? false}
          />
        </RenderInput>
      </FieldGroup>

      <Field data-invalid={!!errors.lowStockThreshold}>
        <RenderInput
          field="lowStockThreshold"
          label="Low Stock Threshold"
          mode={mode}
          isLocked={locked["lowStockThreshold"] ?? false}
          onUnlock={onUnlock}
          hasError={!!errors.lowStockThreshold}
        >
          <Input
            value={fields.lowStockThreshold}
            onInput={(e) => {
              onFieldChange("lowStockThreshold", e.currentTarget.value)
              clearFieldError("lowStockThreshold")
            }}
            type="number"
            step="0.01"
            min="0"
            placeholder="0"
            disabled={locked["lowStockThreshold"] ?? false}
            aria-invalid={!!errors.lowStockThreshold}
          />
        </RenderInput>
      </Field>

      <Separator />

      <FieldGroup className="grid grid-cols-2">
        <Field data-invalid={!!errors.quantityReceived}>
          <FieldLabel htmlFor="quantityReceived">Quantity Received</FieldLabel>
          <FieldContent>
            <Input
              id="quantityReceived"
              name="quantityReceived"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0"
              aria-invalid={!!errors.quantityReceived}
              onInput={() => clearFieldError("quantityReceived")}
            />
          </FieldContent>
          {errors.quantityReceived ? (
            <FieldError>{errors.quantityReceived}</FieldError>
          ) : null}
        </Field>

        <Field data-invalid={!!errors.totalProcurementCost}>
          <FieldLabel htmlFor="totalProcurementCost">
            Total Procurement Cost
          </FieldLabel>
          <FieldContent>
            <Input
              id="totalProcurementCost"
              name="totalProcurementCost"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0"
              aria-invalid={!!errors.totalProcurementCost}
              onInput={() => clearFieldError("totalProcurementCost")}
            />
          </FieldContent>
          {errors.totalProcurementCost ? (
            <FieldError>{errors.totalProcurementCost}</FieldError>
          ) : null}
        </Field>
      </FieldGroup>
    </div>
  )
})

export default FieldCard
