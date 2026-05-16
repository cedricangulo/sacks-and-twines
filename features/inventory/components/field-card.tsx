"use client"

import { memo } from "react"
import { PencilIcon } from "lucide-react"
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
import SupplierCombobox from "./supplier-combobox"
import type { StockInFieldErrors } from "../validation"

interface FieldCardProps {
  mode: "existing" | "new"
  draftSku: string
  draftBatch: string
  fields: {
    category: string
    baseUom: string
    weightPerUnit: string
    supplierId: string
    lowStockThreshold: string
  }
  locked: Record<string, boolean>
  errors: StockInFieldErrors
  supplierOptions: Array<{ id: string; name: string }>
  onFieldChange: (field: string, value: string) => void
  onUnlock: (field: string) => void
  onCategoryChange: (value: string) => void
  clearFieldError: (field: keyof StockInFieldErrors) => void
}

const FieldCard = memo(function FieldCard({
  mode,
  draftSku,
  draftBatch,
  fields,
  locked,
  errors,
  supplierOptions,
  onFieldChange,
  onUnlock,
  onCategoryChange,
  clearFieldError,
}: FieldCardProps) {
  const renderField = (
    field: string,
    label: string,
    renderInput: (disabled: boolean) => React.ReactNode,
    opts?: { hideLock?: boolean }
  ) => {
    const isLocked = locked[field] ?? false
    const hasError = errors[field as keyof StockInFieldErrors]

    return (
      <Field data-invalid={!!hasError}>
        <div className="flex items-center justify-between gap-2">
          <FieldLabel
            htmlFor={field}
            className={isLocked ? "text-muted-foreground" : undefined}
          >
            {label}
          </FieldLabel>
          {isLocked && !opts?.hideLock && mode === "existing" ? (
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
        <FieldContent>{renderInput(isLocked)}</FieldContent>
        {hasError ? <FieldError>{hasError}</FieldError> : null}
      </Field>
    )
  }

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
        {renderField("category", "Category", (disabled) => (
          <Select
            value={fields.category || undefined}
            onValueChange={onCategoryChange}
            disabled={disabled}
          >
            <SelectTrigger
              className="w-full"
              aria-invalid={!!errors.category}
            >
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="sacks">Sacks</SelectItem>
                <SelectItem value="twines">Twines</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        ))}

        {renderField("baseUom", "Unit / Measurement", (disabled) => (
          <Select
            value={fields.baseUom || undefined}
            onValueChange={(v) => {
              onFieldChange("baseUom", v)
              clearFieldError("baseUom")
            }}
            disabled={disabled}
          >
            <SelectTrigger
              className="w-full"
              aria-invalid={!!errors.baseUom}
            >
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="piece">Piece</SelectItem>
                <SelectItem value="roll">Roll</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        ))}
      </FieldGroup>

      <FieldGroup className="grid grid-cols-2">
        {renderField(
          "weightPerUnit",
          "Weight per Unit (kg)",
          (disabled) => (
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
              disabled={disabled}
              aria-invalid={!!errors.weightPerUnit}
            />
          )
        )}

        {renderField(
          "supplierId",
          "Supplier",
          (disabled) => (
            <SupplierCombobox
              suppliers={supplierOptions}
              value={fields.supplierId}
              onChange={(v) => {
                onFieldChange("supplierId", v)
                clearFieldError("supplierId")
              }}
              disabled={disabled}
            />
          ),
          { hideLock: mode === "new" }
        )}
      </FieldGroup>

      <Field data-invalid={!!errors.lowStockThreshold}>
        {renderField(
          "lowStockThreshold",
          "Low Stock Threshold",
          (disabled) => (
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
              disabled={disabled}
              aria-invalid={!!errors.lowStockThreshold}
            />
          )
        )}
      </Field>

      <Separator />

      <FieldGroup className="grid grid-cols-2">
        <Field data-invalid={!!errors.quantityReceived}>
          <FieldLabel htmlFor="quantityReceived">
            Quantity Received
          </FieldLabel>
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
